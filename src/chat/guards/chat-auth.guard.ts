// src/chat/guards/chat-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { ChatAuthMode } from "../chat-auth-mode.enum";

@Injectable()
export class ChatAuthGuard implements CanActivate {
  private readonly jwtAuthGuard: any;

  constructor(private readonly configService: ConfigService) {
    // Reutilizamos el guard "jwt" de passport sin declararlo como provider aparte
    this.jwtAuthGuard = new (AuthGuard("jwt") as any)();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode =
      (this.configService.get<string>("CHAT_AUTH_MODE") as ChatAuthMode) ??
      ChatAuthMode.NONE;

    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined =
      req.headers["authorization"] || req.headers["Authorization"];

    // 1) MODO SIN AUTH (CHAT_AUTH_MODE=none)
    //
    // - Si NO hay token → permitimos siempre (chat público), req.user = null
    // - Si HAY token → lo validamos con AuthGuard("jwt")
    //      - Si el token es inválido o caducado → 401
    if (mode === ChatAuthMode.NONE) {
      if (!authHeader) {
        // Chat totalmente público sin identificación
        req.user = null;
        return true;
      }

      // Hay Authorization: Bearer ... → validamos el JWT
      try {
        const result = await this.jwtAuthGuard.canActivate(context);
        // AuthGuard("jwt") ya habrá rellenado req.user si es válido
        return result as boolean;
      } catch (err) {
        // Aquí capturamos errores de verificación (incluida expiración)
        throw new UnauthorizedException(
          "Token anónimo inválido o caducado para el chat"
        );
      }
    }

    // 2) MODO LOCAL / OAUTH2 → exigimos JWT siempre
    try {
      const result = await this.jwtAuthGuard.canActivate(context);
      return result as boolean;
    } catch (err) {
      throw new UnauthorizedException("Token requerido para el chat");
    }
  }
}
