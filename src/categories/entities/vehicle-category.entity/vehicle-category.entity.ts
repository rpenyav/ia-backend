// src/categories/entities/vehicle-category.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("vehicle_categories")
export class VehicleCategory {
  @PrimaryGeneratedColumn()
  id: number;

  // slug: 'suv', 'berlina', 'compacto-ciudad', etc.
  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string; // 'SUV', 'Berlina', etc.

  @Column({ type: "text", nullable: true })
  description?: string;
}
