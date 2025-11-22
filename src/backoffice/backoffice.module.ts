// src/backoffice/backoffice.module.ts
import { Module } from "@nestjs/common";
import { BackofficeController } from "./backoffice.controller";
import { UsageModule } from "src/usage/usage.module";
import { UsersModule } from "src/users/users.module";
import { BackofficeUsersController } from "./backoffice.users.controller";
import { SettingsModule } from "src/settings/settings.module";
import { BackofficeSettingsController } from "./backoffice.settings.controller";

@Module({
  imports: [UsageModule, UsersModule, SettingsModule.register()],
  controllers: [
    BackofficeController,
    BackofficeUsersController,
    BackofficeSettingsController,
  ],
})
export class BackofficeModule {}
