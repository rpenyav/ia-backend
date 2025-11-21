import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Message } from "./message.entity";

@Entity({ name: "conversations" })
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // null si el chat está en modo anon (CHAT_AUTH_MODE=none)
  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  title?: string | null;

  // opcional: para el futuro, para diferenciar frontends, etc.
  @Column({ type: "varchar", length: 100, nullable: true })
  channel?: string | null;

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
