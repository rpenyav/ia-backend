// src/conversations/conversations.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface PaginatedResult<T> {
  pageSize: number;
  pageNumber: number;
  totalRegisters: number;
  list: T[];
}

@Controller("conversations")
@UseGuards(JwtAuthGuard) // 🔒 todas las rutas requieren Bearer token
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  create(@Body() dto: CreateConversationDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub; // 👈 del JWT
    return this.conversationsService.create(dto, userId);
  }

  @Get()
  async findAll(@Req() req: any): Promise<PaginatedResult<any>> {
    const userId = req.user?.userId || req.user?.sub;
    const items = await this.conversationsService.findAllForUser(userId);

    return {
      pageSize: items.length,
      pageNumber: 1,
      totalRegisters: items.length,
      list: items,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.conversationsService.findOneForUser(id, userId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateConversationDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.conversationsService.update(id, userId, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.conversationsService.remove(id, userId);
  }
}
