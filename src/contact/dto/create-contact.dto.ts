// src/contact/dto/create-contact.dto.ts
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  company: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
