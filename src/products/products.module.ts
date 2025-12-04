// src/products/products.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { VehicleCategory } from "src/categories/entities/vehicle-category.entity/vehicle-category.entity";
import { Product } from "./entities/product.entity/product.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Product, VehicleCategory])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // 👈 esto permite que otros módulos inyecten ProductsService
})
export class ProductsModule {}
