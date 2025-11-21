// src/usage/usage.controller.ts
import { Controller, Get, Param } from "@nestjs/common";
import { UsageService } from "./usage.service";

@Controller("usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  // GET /usage → últimos registros (hasta 1000)
  @Get()
  findAll() {
    return this.usageService.findAll();
  }

  // GET /usage/by-user/:userId
  @Get("by-user/:userId")
  findByUser(@Param("userId") userId: string) {
    return this.usageService.findByUser(userId);
  }

  // GET /usage/by-conversation/:conversationId
  @Get("by-conversation/:conversationId")
  findByConversation(@Param("conversationId") conversationId: string) {
    return this.usageService.findByConversation(conversationId);
  }
}
