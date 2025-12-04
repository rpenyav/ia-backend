// src/categories/categories.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCategoryDto } from "./dto/create-category.dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto/update-category.dto";
import { VehicleCategory } from "./entities/vehicle-category.entity/vehicle-category.entity";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(VehicleCategory)
    private readonly categoriesRepo: Repository<VehicleCategory>
  ) {}

  async create(dto: CreateCategoryDto): Promise<VehicleCategory> {
    const existingByCode = await this.categoriesRepo.findOne({
      where: { code: dto.code },
    });
    if (existingByCode) {
      throw new BadRequestException("Category code already exists");
    }

    const existingBySlug = await this.categoriesRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existingBySlug) {
      throw new BadRequestException("Category slug already exists");
    }

    const category = this.categoriesRepo.create(dto);
    return this.categoriesRepo.save(category);
  }

  findAll(): Promise<VehicleCategory[]> {
    return this.categoriesRepo.find({
      order: { name: "ASC" },
    });
  }

  async findOne(id: number): Promise<VehicleCategory> {
    const category = await this.categoriesRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  // Buscar por slug (para /categories/slug/:slug)
  async findBySlug(slug: string): Promise<VehicleCategory> {
    const category = await this.categoriesRepo.findOne({ where: { slug } });
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<VehicleCategory> {
    const category = await this.findOne(id);

    if (dto.code && dto.code !== category.code) {
      const existingByCode = await this.categoriesRepo.findOne({
        where: { code: dto.code },
      });
      if (existingByCode) {
        throw new BadRequestException("Category code already exists");
      }
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existingBySlug = await this.categoriesRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existingBySlug) {
        throw new BadRequestException("Category slug already exists");
      }
    }

    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepo.remove(category);
  }
}
