// src/products/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto/update-product.dto";
import { Product } from "./entities/product.entity/product.entity";

interface PaginatedResult<T> {
  pageSize: number;
  pageNumber: number;
  totalRegisters: number;
  list: T[];
}

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  async findAll(): Promise<PaginatedResult<Product>> {
    const items = await this.productsService.findAll();
    return {
      pageSize: items.length,
      pageNumber: 1,
      totalRegisters: items.length,
      list: items,
    };
  }

  // 🔹 GET /products/slug/:slug
  @Get("slug/:slug")
  findBySlug(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // GET /products/:id (UUID)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.productsService.remove(id);
  }
}
