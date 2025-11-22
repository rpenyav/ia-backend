import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";

class AnonymousSessionDto {
  appId?: string;
  channel?: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * Sesión anónima (modo CHAT_AUTH_MODE=none)
   * Body opcional: { appId?: string; channel?: string }
   */
  @Public()
  @Post("anonymous-session")
  async createAnonymousSession(@Body() body: AnonymousSessionDto) {
    return this.authService.createAnonymousSession({
      appId: body?.appId,
      channel: body?.channel,
    });
  }
}
