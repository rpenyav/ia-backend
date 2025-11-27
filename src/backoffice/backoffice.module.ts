// src/backoffice/backoffice.module.ts
import { Module } from "@nestjs/common";
import { BackofficeController } from "./backoffice.controller";
import { UsageModule } from "src/usage/usage.module";
import { UsersModule } from "src/users/users.module";
import { BackofficeUsersController } from "./backoffice.users.controller";
import { SettingsModule } from "src/settings/settings.module";
import { BackofficeSettingsController } from "./backoffice.settings.controller";
import { BackofficeEnvConfigController } from "./backoffice.env-config.controller";
import { EnvConfigModule } from "src/env-config/env-config.module";
import { BackofficeAuthGuard } from "./backoffice-auth.guard";
import { BackofficeAuthModule } from "src/backoffice-auth/backoffice-auth.module";
import { BackofficeAuthController } from "./backoffice.auth.controller"; // 👈 IMPORTANTE

@Module({
  imports: [
    UsageModule,
    UsersModule,
    SettingsModule.register(),
    EnvConfigModule.register(),
    BackofficeAuthModule, // servicio para validar super admin
  ],
  controllers: [
    BackofficeAuthController, // 👈 login/logout backoffice
    BackofficeController, // dashboard
    BackofficeUsersController, // gestión de usuarios
    BackofficeSettingsController, // settings
    BackofficeEnvConfigController, // env vars
  ],
  providers: [BackofficeAuthGuard],
})
export class BackofficeModule {}
