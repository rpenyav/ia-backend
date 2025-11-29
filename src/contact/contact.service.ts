// src/contact/contact.service.ts
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { CreateContactDto } from "./dto/create-contact.dto";

@Injectable()
export class ContactService {
  async handleContact(dto: CreateContactDto, ip?: string) {
    try {
      // Aquí decides qué hacer con el lead:
      // - Guardarlo en BD
      // - Enviar un email
      // - Llamar a un webhook de tu CRM
      // De momento, para la demo, simplemente hacemos log.

      console.log("Nuevo lead de contacto NERIA:", {
        ...dto,
        ip,
        createdAt: new Date().toISOString(),
      });

      // Si más adelante añades persistencia, simplemente reemplaza la lógica de arriba
      // por la llamada a tu repositorio / servicio de email.

      return { ok: true };
    } catch (err) {
      console.error("Error procesando contacto", err);
      throw new InternalServerErrorException(
        "No se pudo registrar el contacto"
      );
    }
  }
}
