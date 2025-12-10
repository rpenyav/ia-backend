// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface PaginatedResult<T> {
  pageSize: number;
  pageNumber: number;
  totalRegisters: number;
  list: T[];
}

@Controller("users")
@UseGuards(JwtAuthGuard) // 👈 TODOS los endpoints de /users requieren token
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(): Promise<PaginatedResult<any>> {
    const items = await this.usersService.findAll();
    return {
      pageSize: items.length,
      pageNumber: 1,
      totalRegisters: items.length,
      list: items,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }

  // opcional: info del usuario actual sin pasar id
  @Get("me/info")
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.userId);
  }
}
