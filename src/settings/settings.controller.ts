// src/settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SettingsService } from "./settings.service";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";

@UseGuards(AuthGuard("jwt")) // 👈 obliga a Bearer token válido
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  create(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.create(createSettingDto);
  }

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.settingsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(id, updateSettingDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.settingsService.remove(id);
  }
}
