// src/env-config/entities/env-var.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("env_vars")
export class EnvVar {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "key", unique: true })
  key: string;

  @Column("text")
  value: string;

  @Column({ nullable: true })
  description?: string;

  // 👇 importante: mapeamos a is_secret
  @Column({ name: "is_secret", type: "tinyint", default: 0 })
  isSecret: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
