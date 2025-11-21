// src/usage/entities/usage.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";

@Entity("usage")
@Index(["provider", "model", "createdAt"])
@Index(["userId", "createdAt"])
export class Usage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  provider: string; // openai | grok | gemini | deepseek | ...

  @Column({ type: "varchar", length: 200 })
  model: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  userId: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  conversationId: string | null;

  @Column({ type: "int", nullable: true })
  inputTokens: number | null;

  @Column({ type: "int", nullable: true })
  outputTokens: number | null;

  @Column({ type: "int" })
  totalTokens: number; // siempre un número (0 si no sabemos)

  @CreateDateColumn()
  createdAt: Date;
}
