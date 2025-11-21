import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { DynamicAuthGuard } from "./guards/dynamic-auth.guard";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>("JWT_SECRET")!;
        const expiresInEnv = config.get<string>("JWT_EXPIRES_IN") || "1h";

        return {
          secret,
          signOptions: {
            // ms.StringValue es básicamente un string tipo "1h", "60s", etc.
            expiresIn: expiresInEnv as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: DynamicAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
