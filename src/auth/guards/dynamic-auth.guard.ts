// src/auth/guards/dynamic-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AuthStrategy } from "../auth-strategy.enum";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { Request } from "express";

@Injectable()
export class DynamicAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 0) Rutas que NO deben pasar por la API key / estrategia global
    const path = request.path || request.url || "";

    if (
      path.startsWith("/backoffice") || // login + dashboard + users + settings + env
      path.startsWith("/static") // CSS, assets del backoffice
    ) {
      return true;
    }

    // 1) Rutas marcadas como públicas con el decorador @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2) Elegimos la estrategia desde config
    const strategy =
      (this.configService.get<AuthStrategy>("AUTH_STRATEGY") as AuthStrategy) ??
      AuthStrategy.API_KEY;

    switch (strategy) {
      case AuthStrategy.NONE:
        return true;

      case AuthStrategy.API_KEY: {
        const expectedApiKey =
          this.configService.get<string>("INTERNAL_API_KEY");
        if (!expectedApiKey) {
          throw new UnauthorizedException("API key no configurada");
        }

        const headerApiKey =
          (request.headers["x-api-key"] as string) ||
          (request.headers["X-API-KEY"] as string);

        if (!headerApiKey || headerApiKey !== expectedApiKey) {
          throw new UnauthorizedException("API key inválida");
        }

        return true;
      }

      case AuthStrategy.OAUTH2: {
        if ((request as any).user) return true;
        throw new UnauthorizedException("Usuario no autenticado (OAuth2)");
      }

      default:
        throw new UnauthorizedException(
          "Estrategia de autenticación no soportada"
        );
    }
  }
}
