// src/backoffice/backoffice.controller.ts
import { Controller, Get, Query, Render, UseGuards } from "@nestjs/common";
import { UsageService } from "../usage/usage.service";
import { UsersService } from "../users/users.service";
import { BackofficeAuthGuard } from "./backoffice-auth.guard";

@UseGuards(BackofficeAuthGuard)
@Controller("backoffice")
export class BackofficeController {
  constructor(
    private readonly usageService: UsageService,
    private readonly usersService: UsersService
  ) {}

  @Get()
  @Render("dashboard")
  async getDashboard(
    @Query("page") pageParam?: string,
    @Query("userId") userIdParam?: string,
    @Query("provider") providerParam?: string,
    @Query("model") modelParam?: string,
    @Query("dateFrom") dateFromParam?: string,
    @Query("dateTo") dateToParam?: string
  ) {
    const rawPage = parseInt(pageParam ?? "1", 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = 10; // 10 registros por página

    // --- Filtros recibidos por query ---
    const filters = {
      userId: (userIdParam ?? "").trim() || "",
      provider: (providerParam ?? "").trim() || "",
      model: (modelParam ?? "").trim() || "",
      dateFrom: (dateFromParam ?? "").trim() || "",
      dateTo: (dateToParam ?? "").trim() || "",
    };

    // Parseo de fechas (si vienen)
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (filters.dateFrom) {
      // asumimos formato YYYY-MM-DD
      dateFrom = new Date(filters.dateFrom + "T00:00:00.000Z");
    }
    if (filters.dateTo) {
      dateTo = new Date(filters.dateTo + "T23:59:59.999Z");
    }

    // 1) Obtenemos hasta 1000 usages (ya lo hace tu servicio)
    const allUsages = await this.usageService.findAll();

    // 2) Filtrado en memoria
    const filtered = allUsages.filter((u: any) => {
      // Filtro por userId (exacto)
      if (filters.userId && u.userId !== filters.userId) {
        return false;
      }

      // Filtro por provider (contains, case-insensitive)
      if (filters.provider) {
        const prov = (u.provider ?? "").toLowerCase();
        if (!prov.includes(filters.provider.toLowerCase())) {
          return false;
        }
      }

      // Filtro por modelo (contains, case-insensitive)
      if (filters.model) {
        const mdl = (u.model ?? "").toLowerCase();
        if (!mdl.includes(filters.model.toLowerCase())) {
          return false;
        }
      }

      // Filtro por rango de fechas (createdAt)
      if (dateFrom || dateTo) {
        const createdAt = new Date(u.createdAt);
        if (dateFrom && createdAt < dateFrom) {
          return false;
        }
        if (dateTo && createdAt > dateTo) {
          return false;
        }
      }

      return true;
    });

    const total = filtered.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const safePage = Math.min(Math.max(page, 1), totalPages);

    const start = (safePage - 1) * limit;
    const items = filtered.slice(start, start + limit);

    // 3) Mapeo de usuarios (para mostrar nombre/email)
    const userIds = Array.from(
      new Set(
        items.map((u: any) => u.userId).filter((id): id is string => !!id)
      )
    );

    const usersById = new Map<string, any>();

    await Promise.all(
      userIds.map(async (id) => {
        try {
          const user = await this.usersService.findOne(id);
          if (user) {
            usersById.set(id, user);
          }
        } catch (e) {
          console.error("Error cargando usuario", id, e);
        }
      })
    );

    const usagesWithUserName = items.map((u: any) => {
      const user = u.userId ? usersById.get(u.userId) : null;

      const userName = user?.name || user?.email || u.userId;

      return {
        ...u,
        userName,
      };
    });

    const hasPrev = safePage > 1;
    const hasNext = safePage < totalPages;
    const prevPage = safePage - 1;
    const nextPage = safePage + 1;

    return {
      title: "Panel de administración",
      message: "Hola desde el backoffice 👋",
      usages: usagesWithUserName,
      page: safePage,
      totalPages,
      total,
      hasPrev,
      hasNext,
      prevPage,
      nextPage,
      filters, // 👈 para rellenar el formulario en la vista
    };
  }
}
