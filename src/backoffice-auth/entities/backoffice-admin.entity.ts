// src/backoffice-auth/entities/backoffice-admin.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("backoffice_admins")
export class BackofficeAdmin {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  // 👇 Mapeamos a la columna real "password_hash"
  @Column({ name: "password_hash" })
  passwordHash: string;

  // 👇 Mapeamos a "created_at"
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  // 👇 Mapeamos a "updated_at"
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
