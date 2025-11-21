import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Conversation } from "./conversation.entity";
import { MessageRole } from "../message-role.enum";

@Entity({ name: "messages" })
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages, {
    onDelete: "CASCADE",
  })
  conversation: Conversation;

  @Column({
    type: "enum",
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: "text" })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
