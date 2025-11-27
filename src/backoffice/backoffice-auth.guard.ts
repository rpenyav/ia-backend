// src/backoffice/backoffice-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request, Response } from "express";

@Injectable()
export class BackofficeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // Cookie firmada: backoffice_session = "ok"
    const session = (req as any).signedCookies?.backoffice_session;

    if (session === "ok") {
      return true;
    }

    // No logueado → redirigimos al login
    res.redirect("/backoffice/login");
    return false;
  }
}
