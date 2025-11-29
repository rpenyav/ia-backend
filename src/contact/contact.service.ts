// src/contact/contact.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { CreateContactDto } from "./dto/create-contact.dto";
import axios from "axios";

type EmailTransportMode = "log" | "resend";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  private readonly mode: EmailTransportMode =
    (process.env.EMAIL_TRANSPORT as EmailTransportMode) || "log";

  private readonly toEmail = process.env.CONTACT_RECIPIENT_EMAIL;
  private readonly fromEmail =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM || // por si ya lo tenías
    "NERIA Website <no-reply@example.com>";

  private readonly resendApiKey = process.env.RESEND_API_KEY;

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

      // 2) Sin email de destino, no hacemos nada más
      if (!this.toEmail) {
        this.logger.warn(
          "CONTACT_RECIPIENT_EMAIL no está definido. No se enviará correo."
        );
        return { ok: true };
      }

      // 3) Modo LOG → solo registrar, sin enviar correo
      if (this.mode === "log") {
        this.logger.warn(
          "EMAIL_TRANSPORT=log → se registra el lead pero NO se envía correo."
        );
        return { ok: true };
      }

      // 4) Modo RESEND → usamos la API HTTP
      if (this.mode === "resend") {
        if (!this.resendApiKey) {
          this.logger.error("RESEND_API_KEY no está definida");
          throw new InternalServerErrorException(
            "Configuración de correo inválida"
          );
        }

        await axios.post(
          "https://api.resend.com/emails",
          {
            from: this.fromEmail,
            to: [this.toEmail],
            subject: `Nuevo contacto NERIA de ${dto.name}`,
            text: this.buildPlainText(dto, ip),
            html: this.buildHtml(dto, ip),
          },
          {
            headers: {
              Authorization: `Bearer ${this.resendApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.logger.log(`Email de contacto enviado a ${this.toEmail}`);
        return { ok: true };
      }

      // 5) Si mode no es válido (por si acaso)
      this.logger.error(`EMAIL_TRANSPORT desconocido: ${this.mode}`);
      throw new InternalServerErrorException(
        "Configuración de correo inválida"
      );
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
