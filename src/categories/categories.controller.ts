// src/categories/categories.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto/update-category.dto";
import { VehicleCategory } from "./entities/vehicle-category.entity/vehicle-category.entity";

interface PaginatedResult<T> {
  pageSize: number;
  pageNumber: number;
  totalRegisters: number;
  list: T[];
}

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  async findAll(
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string
  ): Promise<PaginatedResult<VehicleCategory>> {
    const page = Math.max(parseInt(pageStr || "1", 10) || 1, 1);
    const rawPageSize = Math.max(parseInt(pageSizeStr || "10", 10) || 10, 1);
    const pageSize = Math.min(rawPageSize, 100); // límite de seguridad

    const { items, total } = await this.categoriesService.findAllPaginated(
      page,
      pageSize
    );

    return {
      pageSize,
      pageNumber: page,
      totalRegisters: total,
      list: items,
    };
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Get("slug/:slug")
  findBySlug(@Param("slug") slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
