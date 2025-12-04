// src/categories/categories.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";
import { VehicleCategory } from "./entities/vehicle-category.entity/vehicle-category.entity";

@Module({
  imports: [TypeOrmModule.forFeature([VehicleCategory])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule {}
