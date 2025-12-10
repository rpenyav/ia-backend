// src/products/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto/update-product.dto";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * GET /products
   * Devuelve: { pageSize, pageNumber, totalRegisters, list: [] }
   */
  @Get()
  async findAll(
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string
  ) {
    const pageNumber =
      pageRaw && !Number.isNaN(Number(pageRaw)) && Number(pageRaw) > 0
        ? Number(pageRaw)
        : 1;

    const pageSize =
      pageSizeRaw &&
      !Number.isNaN(Number(pageSizeRaw)) &&
      Number(pageSizeRaw) > 0
        ? Number(pageSizeRaw)
        : 10;

    const { items, total } = await this.productsService.findAllPaginated(
      pageNumber,
      pageSize
    );

    return {
      pageSize,
      pageNumber,
      totalRegisters: total,
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
