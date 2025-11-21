// src/auth/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET");

    // Por seguridad: si por alguna razón no está, lanzamos error claro
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // aquí TS ya lo trata como string, no como string | undefined
    });
  }

  async validate(payload: any) {
    // payload viene de lo que firmaste en AuthService (sub, email, etc.)
    return { userId: payload.sub, email: payload.email };
  }
}
