// src/products/entities/product.entity.ts
import { VehicleCategory } from "src/categories/entities/vehicle-category.entity/vehicle-category.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuid } from "uuid";

@Entity("products")
export class Product {
  @PrimaryColumn({ type: "char", length: 36 })
  id: string = uuid();

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  brand: string;

  @Column({ length: 255 })
  model: string;

  @Column({ type: "int" })
  year: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "int", default: 0 })
  mileage: number;

  // FK a vehicle_categories
  @Column()
  vehicleCategoryId: number;

  @ManyToOne(() => VehicleCategory, {
    eager: true, // útil para el chatbot: ya viene la categoría
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "vehicleCategoryId" })
  vehicleCategory: VehicleCategory;

  @Column({ length: 150, unique: true })
  slug: string;

  @Column({ length: 50, default: "diesel" })
  fuelType: string;

  @Column({ length: 50, default: "manual" })
  gearbox: string;

  @Column({ type: "tinyint", width: 1, default: 5 })
  seats: number;

  @Column({ type: "tinyint", width: 1, default: 5 })
  doors: number;

  @Column({ length: 50, nullable: true })
  color?: string;

  // ✅ imagen “legacy” (una sola)
  @Column({ length: 500, nullable: true })
  imageUrl?: string;

  // ✅ NUEVO: array de imágenes (URLs) en BBDD (JSON)
  @Column({ type: "json", nullable: true })
  images?: string[];

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "tinyint", width: 1, default: 1 })
  active: boolean;

  @CreateDateColumn({ type: "datetime" })
  createdAt: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt: Date;
}
