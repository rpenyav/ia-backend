// src/settings/entities/setting.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("settings")
export class Setting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  key: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  scope: string | null; // ej: "global" o id_cliente

  @Column({ type: "json", nullable: true })
  value: any;

  @Column({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  createdAt: Date;

  @Column({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt: Date;
}
