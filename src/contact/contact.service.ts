// src/contact/contact.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { CreateContactDto } from "./dto/create-contact.dto";
import * as nodemailer from "nodemailer";

type EmailTransportMode = "smtp" | "log";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  // 👇 por defecto "log" para que en Railway NO intente usar SMTP
  private readonly mode: EmailTransportMode =
    (process.env.EMAIL_TRANSPORT as EmailTransportMode) || "log";

  private readonly toEmail = process.env.CONTACT_RECIPIENT_EMAIL;
  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpPort = Number(process.env.SMTP_PORT || 587);
  private readonly smtpUser = process.env.SMTP_USER;
  private readonly smtpPass = process.env.SMTP_PASS;
  private readonly smtpFrom =
    process.env.SMTP_FROM || this.toEmail || "no-reply@example.com";

  // Solo creamos el transporter si estamos en modo SMTP
  private createSmtpTransport() {
    if (!this.smtpHost) {
      throw new Error("SMTP_HOST no definido");
    }

    return nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465, // true para 465, false para 587/25
      auth:
        this.smtpUser && this.smtpPass
          ? {
              user: this.smtpUser,
              pass: this.smtpPass,
            }
          : undefined,
    });
  }

  async handleContact(dto: CreateContactDto, ip?: string) {
    try {
      // 1) Log común siempre
      this.logger.log("Nuevo lead de contacto NERIA:");
      this.logger.log(
        JSON.stringify(
          {
            ...dto,
            to: this.toEmail,
            ip,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // 2) Si no hay email de destino, no intentamos enviar nada
      if (!this.toEmail) {
        this.logger.warn(
          "CONTACT_RECIPIENT_EMAIL no está definido. No se enviará correo."
        );
        return { ok: true };
      }

      // 3) Si estamos en modo "log", NO usamos SMTP (ideal en Railway)
      if (this.mode === "log") {
        this.logger.warn(
          "EMAIL_TRANSPORT=log → se registra el lead pero NO se envía correo."
        );
        return { ok: true };
      }

      // 4) Modo SMTP (solo lo uses cuando estés en un hosting que lo permita)
      const transporter = this.createSmtpTransport();

      await transporter.sendMail({
        to: this.toEmail,
        from: this.smtpFrom,
        subject: `Nuevo contacto NERIA de ${dto.name}`,
        text: this.buildPlainText(dto, ip),
        html: this.buildHtml(dto, ip),
      });

      this.logger.log(`Email de contacto enviado a ${this.toEmail}`);

      return { ok: true };
    } catch (err) {
      this.logger.error("Error procesando contacto", err as any);
      throw new InternalServerErrorException(
        "No se pudo registrar el contacto"
      );
    }
  }

  private buildPlainText(dto: CreateContactDto, ip?: string): string {
    return `
Nuevo formulario de contacto NERIA

Nombre: ${dto.name}
Email: ${dto.email}
Empresa: ${dto.company || "-"}
IP: ${ip ?? "desconocida"}

Mensaje:
${dto.message}
`.trim();
  }

  private buildHtml(dto: CreateContactDto, ip?: string): string {
    return `
<h2>Nuevo formulario de contacto NERIA</h2>
<ul>
  <li><strong>Nombre:</strong> ${dto.name}</li>
  <li><strong>Email:</strong> ${dto.email}</li>
  <li><strong>Empresa:</strong> ${dto.company || "-"}</li>
  <li><strong>IP:</strong> ${ip ?? "desconocida"}</li>
</ul>
<p><strong>Mensaje:</strong></p>
<p>${dto.message.replace(/\n/g, "<br />")}</p>
`.trim();
  }
}
