import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Sesión anónima para modo CHAT_AUTH_MODE = "none"
   * - sub = "anon:<uuid>"
   * - exp = 15 minutos
   */
  async createAnonymousSession(params?: {
    appId?: string;
    channel?: string;
  }): Promise<{ accessToken: string; expiresIn: number }> {
    const anonId = `anon:${randomUUID()}`;

    const appIdFromEnv = this.config.get<string>("APP_ID") ?? "default-app";

    const payload: any = {
      sub: anonId,
      chatMode: "none",
      appId: params?.appId || appIdFromEnv,
      channel: params?.channel || "web_widget",
      role: "anonymous",
    };

    // 15 minutos (900 segundos)
    const expiresInSeconds = 15 * 60;

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds, // también se puede "15m"
    });

    return {
      accessToken,
      expiresIn: expiresInSeconds,
    };
  }
}
