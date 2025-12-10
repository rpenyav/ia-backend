import { Controller, Get, Param, Query } from "@nestjs/common";
import { UsageService } from "./usage.service";

@Controller("usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /**
   * GET /usage?page=1&pageSize=10
   * Devuelve:
   * {
   *   pageSize,
   *   pageNumber,
   *   totalRegisters,
   *   list: [...]
   * }
   */
  @Get()
  async findPaginated(
    @Query("page") pageStr?: string,
    @Query("pageSize") pageSizeStr?: string
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 10;

    return this.usageService.findPaginated(page, pageSize);
  }

  // Si quieres seguir teniendo el endpoint "sin paginar" (opcional):
  // GET /usage/all
  @Get("all/raw")
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
