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
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto/update-category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
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
