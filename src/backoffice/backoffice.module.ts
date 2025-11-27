// src/backoffice/backoffice.module.ts
import { Module } from "@nestjs/common";
import { BackofficeController } from "./backoffice.controller";
import { UsageModule } from "src/usage/usage.module";
import { UsersModule } from "src/users/users.module";
import { BackofficeUsersController } from "./backoffice.users.controller";
import { SettingsModule } from "src/settings/settings.module";
import { BackofficeSettingsController } from "./backoffice.settings.controller";
import { BackofficeAuthGuard } from "./backoffice-auth.guard";
import { BackofficeAuthModule } from "src/backoffice-auth/backoffice-auth.module";
import { BackofficeAuthController } from "./backoffice.auth.controller";

@Module({
  imports: [
    UsageModule,
    UsersModule,
    SettingsModule.register(),
    BackofficeAuthModule,
  ],
  controllers: [
    BackofficeAuthController,
    BackofficeController,
    BackofficeUsersController,
    BackofficeSettingsController,
  ],
  providers: [BackofficeAuthGuard],
})
export class BackofficeModule {}
