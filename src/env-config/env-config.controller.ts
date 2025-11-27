// src/env-config/env-config.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { EnvConfigService } from "./env-config.service";
import { CreateEnvVarDto } from "./dto/create-env-var.dto";
import { UpdateEnvVarDto } from "./dto/update-env-var.dto";

@UseGuards(AuthGuard("jwt"))
@Controller("env-config")
export class EnvConfigController {
  constructor(private readonly envConfigService: EnvConfigService) {}

  @Get()
  findAll() {
    return this.envConfigService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.envConfigService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEnvVarDto) {
    return this.envConfigService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateEnvVarDto) {
    return this.envConfigService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.envConfigService.remove(id);
  }
}
