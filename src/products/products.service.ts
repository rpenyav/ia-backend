// src/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { VehicleCategory } from "src/categories/entities/vehicle-category.entity/vehicle-category.entity";
import { Repository } from "typeorm";
import { v4 as uuid } from "uuid";
import { CreateProductDto } from "./dto/create-product.dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto/update-product.dto";
import { Product } from "./entities/product.entity/product.entity";

export interface ChatProductSearchFilters {
  categorySlug?: string;
  brand?: string;
  fuelType?: string;
  gearbox?: string;
  maxPrice?: number;
  limit?: number;
}

export interface ChatProductSearchFilters {
  categorySlug?: string;
  brand?: string;
  fuelType?: string;
  gearbox?: string;
  maxPrice?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(VehicleCategory)
    private readonly categoriesRepo: Repository<VehicleCategory>
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const category = await this.categoriesRepo.findOne({
      where: { id: dto.vehicleCategoryId },
    });
    if (!category) {
      throw new BadRequestException("Invalid vehicleCategoryId");
    }

    const product = this.productsRepo.create({
      id: uuid(),
      ...dto,
    });

    return this.productsRepo.save(product);
  }

  findAll(): Promise<Product[]> {
    return this.productsRepo.find({
      where: { active: true },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  // 🔹 NUEVO: buscar producto por slug
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepo.findOne({ where: { slug } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.vehicleCategoryId) {
      const category = await this.categoriesRepo.findOne({
        where: { id: dto.vehicleCategoryId },
      });
      if (!category) {
        throw new BadRequestException("Invalid vehicleCategoryId");
      }
    }

    Object.assign(product, dto);
    return this.productsRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepo.remove(product);
  }

  async searchForChat(
    filters: ChatProductSearchFilters = {}
  ): Promise<Product[]> {
    const {
      categorySlug,
      brand,
      fuelType,
      gearbox,
      maxPrice,
      limit = 5,
    } = filters;

    const qb = this.productsRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.vehicleCategory", "c")
      .where("p.active = :active", { active: true });

    if (categorySlug) {
      qb.andWhere("c.slug = :categorySlug", { categorySlug });
    }

    if (brand) {
      qb.andWhere("p.brand LIKE :brand", { brand: `%${brand}%` });
    }

    if (fuelType) {
      qb.andWhere("p.fuelType = :fuelType", { fuelType });
    }

    if (gearbox) {
      qb.andWhere("p.gearbox = :gearbox", { gearbox });
    }

    if (maxPrice) {
      qb.andWhere("p.price <= :maxPrice", { maxPrice });
    }

    qb.orderBy("p.price", "ASC").limit(limit);

    return qb.getMany();
  }
}
