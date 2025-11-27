// src/backoffice/backoffice.auth.controller.ts
import { Body, Controller, Get, Post, Render, Res } from "@nestjs/common";
import { Response } from "express";
import { BackofficeAuthService } from "../backoffice-auth/backoffice-auth.service";

@Controller("backoffice")
export class BackofficeAuthController {
  constructor(private readonly backofficeAuth: BackofficeAuthService) {}

  @Get("login")
  @Render("backoffice-login")
  getLogin() {
    return {
      title: "Login backoffice",
      error: null,
    };
  }

  @Post("login")
  @Render("backoffice-login")
  async postLogin(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const { email, password } = body;

    const admin = await this.backofficeAuth.validateCredentials(
      email,
      password
    );

    if (!admin) {
      return {
        title: "Login backoffice",
        error: "Credenciales incorrectas",
      };
    }

    // Login OK → cookie firmada
    res.cookie("backoffice_session", "ok", {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    // Redirigimos al dashboard
    res.redirect("/backoffice");
    return;
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("backoffice_session");
    res.redirect("/backoffice/login");
  }
}
