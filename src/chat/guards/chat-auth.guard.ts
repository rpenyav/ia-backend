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

    // 1) MODO SIN AUTH → no exigimos token
    if (mode === ChatAuthMode.NONE) {
      return true;
    }

    // 2) MODO LOCAL / OAUTH2 → exigimos JWT
    try {
      const result = await this.jwtAuthGuard.canActivate(context);
      return result as boolean;
    } catch (err) {
      throw new UnauthorizedException("Token requerido para el chat");
    }
  }
}
