// src/backoffice/backoffice.settings.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  Render,
} from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";

@Controller("backoffice/settings")
export class BackofficeSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // LISTADO + BUSCADOR + PAGINACIÓN
  @Get()
  @Render("settings-list")
  async listSettings(
    @Query("page") pageParam?: string,
    @Query("q") q?: string
  ) {
    const rawPage = parseInt(pageParam ?? "1", 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = 10;

    const search = (q ?? "").trim().toLowerCase();

    const allSettings = await this.settingsService.findAll();

    // Filtro por key o scope
    const filtered = allSettings.filter((s: any) => {
      if (!search) return true;
      const key = (s.key ?? "").toLowerCase();
      const scope = (s.scope ?? "").toLowerCase();
      return key.includes(search) || scope.includes(search);
    });

    const total = filtered.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * limit;
    const items = filtered.slice(start, start + limit);

    // Preparamos value como JSON de texto
    const settingsForView = items.map((s: any) => ({
      ...s,
      valueJson: JSON.stringify(s.value ?? null, null, 2),
    }));

    const hasPrev = safePage > 1;
    const hasNext = safePage < totalPages;

    return {
      title: "Settings",
      settingsList: settingsForView, // 👈 nombre cambiado para no chocar con Express
      page: safePage,
      totalPages,
      total,
      hasPrev,
      hasNext,
      prevPage: safePage - 1,
      nextPage: safePage + 1,
      q: search,
    };
  }

  // FORMULARIO CREAR
  @Get("create")
  @Render("settings-create")
  getCreateForm() {
    return {
      title: "Crear setting",
    };
  }

  // POST CREAR
  @Post("create")
  @Redirect("/backoffice/settings")
  async createSetting(@Body() body: any) {
    const { key, scope, valueJson } = body;

    let value: any;
    try {
      value = valueJson ? JSON.parse(valueJson) : null;
    } catch {
      // Si no es JSON válido, lo guardamos como string
      value = valueJson;
    }

    await this.settingsService.create({
      key,
      scope: scope || null,
      value,
    });

    return;
  }

  // FORMULARIO EDITAR
  @Get(":id/edit")
  @Render("settings-edit")
  async getEditForm(@Param("id") id: string) {
    const setting = await this.settingsService.findOne(id);

    if (!setting) {
      return {
        title: "Setting no encontrado",
        setting: null,
      };
    }

    const valueJson = JSON.stringify(setting.value ?? null, null, 2);

    return {
      title: `Editar setting ${setting.key}`,
      setting,
      valueJson,
    };
  }

  // POST EDITAR
  @Post(":id/edit")
  @Redirect("/backoffice/settings")
  async editSetting(@Param("id") id: string, @Body() body: any) {
    const { key, scope, valueJson } = body;

    let value: any;
    try {
      value = valueJson ? JSON.parse(valueJson) : null;
    } catch {
      value = valueJson;
    }

    await this.settingsService.update(id, {
      key,
      scope: scope || null,
      value,
    });

    return;
  }

  // BORRAR
  @Post(":id/delete")
  @Redirect("/backoffice/settings")
  async deleteSetting(@Param("id") id: string) {
    await this.settingsService.remove(id);
    return;
  }
}
