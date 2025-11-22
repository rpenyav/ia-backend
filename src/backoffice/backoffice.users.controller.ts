// src/backoffice/backoffice.users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Render,
  Redirect,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";

@Controller("backoffice/users")
export class BackofficeUsersController {
  constructor(private readonly usersService: UsersService) {}

  // LISTADO + FILTRO + PAGINACIÓN
  @Get()
  @Render("users-list")
  async listUsers(@Query("page") pageParam?: string, @Query("q") q?: string) {
    const rawPage = parseInt(pageParam ?? "1", 10);
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = 10;

    const search = (q ?? "").trim().toLowerCase();

    // 1) Cargamos todos (para simplificar; luego si quieres lo hacemos en BBDD)
    const allUsers = await this.usersService.findAll();

    // 2) Filtramos por nombre/email si hay búsqueda
    const filtered = allUsers.filter((u: any) => {
      if (!search) return true;
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return name.includes(search) || email.includes(search);
    });

    // 3) Paginamos
    const total = filtered.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * limit;
    const items = filtered.slice(start, start + limit);

    const hasPrev = safePage > 1;
    const hasNext = safePage < totalPages;

    return {
      title: "Usuarios",
      users: items,
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
  @Render("users-create")
  getCreateForm() {
    return {
      title: "Crear usuario",
    };
  }

  // POST CREAR
  @Post("create")
  @Redirect("/backoffice/users")
  async createUser(@Body() body: any) {
    const { email, name, password } = body;
    await this.usersService.create({
      email,
      name,
      password,
    });
    return;
  }

  // FORMULARIO EDITAR
  @Get(":id/edit")
  @Render("users-edit")
  async getEditForm(@Param("id") id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      // Si quieres, aquí podrías redirigir o mostrar un error
      return { title: "Usuario no encontrado", user: null };
    }

    return {
      title: `Editar usuario ${user.email}`,
      user,
    };
  }

  // POST EDITAR
  @Post(":id/edit")
  @Redirect("/backoffice/users")
  async editUser(@Param("id") id: string, @Body() body: any) {
    const { name, password } = body;

    await this.usersService.update(id, {
      name,
      password: password || undefined, // si está vacío, no cambia
    });

    return;
  }

  // BORRAR
  @Post(":id/delete")
  @Redirect("/backoffice/users")
  async deleteUser(@Param("id") id: string) {
    await this.usersService.remove(id);
    return;
  }
}
