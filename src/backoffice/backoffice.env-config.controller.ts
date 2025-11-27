// src/backoffice/backoffice.env-config.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  Render,
  UseGuards,
} from "@nestjs/common";
import { EnvConfigService } from "../env-config/env-config.service";
import { BackofficeAuthGuard } from "./backoffice-auth.guard";

@UseGuards(BackofficeAuthGuard)
@Controller("backoffice/env")
export class BackofficeEnvConfigController {
  constructor(private readonly envConfigService: EnvConfigService) {}

  // LISTADO
  @Get()
  @Render("env-list")
  async listEnvVars(@Query("q") q?: string) {
    const search = (q ?? "").trim().toLowerCase();

    const all = await this.envConfigService.findAll();

    const filtered = all.filter((v: any) => {
      if (!search) return true;
      const key = (v.key ?? "").toLowerCase();
      const desc = (v.description ?? "").toLowerCase();
      return key.includes(search) || desc.includes(search);
    });

    return {
      title: "Variables de entorno",
      envVars: filtered,
      q: search,
    };
  }

  // FORMULARIO EDITAR
  @Get(":id/edit")
  @Render("env-edit")
  async getEdit(@Param("id") id: string) {
    const envVar = await this.envConfigService.findOne(id);

    if (!envVar) {
      return {
        title: "Variable no encontrada",
        envVar: null,
      };
    }

    return {
      title: `Editar ${envVar.key}`,
      envVar,
    };
  }

  // POST EDITAR
  @Post(":id/edit")
  @Redirect("/backoffice/env")
  async postEdit(@Param("id") id: string, @Body() body: any) {
    let { value, isSecret } = body;

    // 👇 Normalizamos value: si viene como array, nos quedamos con el último valor
    if (Array.isArray(value)) {
      value = value[value.length - 1];
    }

    // Por si viene undefined, null, etc.
    const finalValue = value != null ? String(value) : "";

    // Checkbox isSecret → "on" | "true" | "1" | undefined
    const isSecretBool =
      isSecret === "on" ||
      isSecret === "true" ||
      isSecret === "1" ||
      isSecret === true;

    await this.envConfigService.update(id, {
      value: finalValue,
      isSecret: isSecretBool,
    });

    return;
  }

  // BORRAR
  @Post(":id/delete")
  @Redirect("/backoffice/env")
  async deleteEnvVar(@Param("id") id: string) {
    await this.envConfigService.remove(id);
    return;
  }
}
