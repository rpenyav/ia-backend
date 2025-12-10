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
  Query,
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
  async findAll(
    @Req() req: any,
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string
  ): Promise<PaginatedResult<any>> {
    const userId = req.user?.userId || req.user?.sub;

    const page = Math.max(parseInt(pageStr || "1", 10) || 1, 1);
    const rawPageSize = Math.max(parseInt(pageSizeStr || "10", 10) || 10, 1);
    const pageSize = Math.min(rawPageSize, 100);

    const { items, total } =
      await this.conversationsService.findAllForUserPaginated(
        userId,
        page,
        pageSize
      );

    return {
      pageSize,
      pageNumber: page,
      totalRegisters: total,
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
