// src/products/dto/create-product.dto.ts
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  brand: string;

  @IsString()
  @MaxLength(255)
  model: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage?: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  vehicleCategoryId: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  gearbox?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doors?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(150)
  slug: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
