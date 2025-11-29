// src/contact/contact.service.ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { CreateContactDto } from "./dto/create-contact.dto";
import * as nodemailer from "nodemailer";

@Injectable()
export class ContactService {
  private readonly toEmail = process.env.CONTACT_RECIPIENT_EMAIL;

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async handleContact(dto: CreateContactDto, ip?: string) {
    try {
      // 1) Log opcional
      console.log("Nuevo lead de contacto NERIA:", {
        ...dto,
        ip,
        createdAt: new Date().toISOString(),
      });

      // 2) Enviar email
      if (this.toEmail) {
        await this.transporter.sendMail({
          to: this.toEmail,
          from: `"NERIA Website" <${process.env.SMTP_FROM || this.toEmail}>`,
          subject: `Nuevo contacto NERIA de ${dto.name}`,
          text: `
Nombre: ${dto.name}
Email: ${dto.email}
Empresa: ${dto.company}
IP: ${ip ?? "desconocida"}

Mensaje:
${dto.message}
          `.trim(),
        });
      }

      return { ok: true };
    } catch (err) {
      console.error("Error procesando contacto", err);
      throw new InternalServerErrorException(
        "No se pudo registrar el contacto"
      );
    }
  }
}
