// src/contact/contact.controller.ts
import { Body, Controller, Ip, Post } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async create(@Body() dto: CreateContactDto, @Ip() ip: string) {
    return this.contactService.handleContact(dto, ip);
  }
}
