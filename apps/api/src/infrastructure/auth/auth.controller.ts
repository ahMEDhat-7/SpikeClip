import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Response, Request as ExpressRequest } from "express";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { Public } from "./jwt-auth.guard";
import { GoogleOAuthGuard } from "./google-auth.guard";

const COOKIE_NAME = "access_token";
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes

function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout", description: "Clears the authentication cookie." })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(@Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    clearAuthCookie(res);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user", description: "Returns the authenticated user's profile." })
  @ApiResponse({ status: 200, description: "User profile", type: UserResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getProfile(@Request() req: { user: { userId: string } }): Promise<UserResponseDto> {
    const profile = await this.authService.getProfile(req.user.userId);
    if (!profile) {
      throw new NotFoundException("User not found");
    }
    return profile;
  }

  @Patch("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update profile", description: "Update the authenticated user's name." })
  @ApiResponse({ status: 200, description: "Updated user profile", type: UserResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateProfile(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateProfileDto
  ): Promise<UserResponseDto> {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  @Get("google")
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @UseGuards(GoogleOAuthGuard, AuthGuard("google"))
  async googleAuth() {}

  @Get("google/callback")
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @UseGuards(GoogleOAuthGuard, AuthGuard("google"))
  async googleCallback(@Req() req: ExpressRequest & { user?: { accessToken?: string } }, @Res() res: Response) {
    try {
      const result = req.user;
      if (!result?.accessToken) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendUrl}/login?error=auth_failed`);
      }
      setAuthCookie(res, result.accessToken);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/dashboard`);
    } catch (err) {
      this.logger.error(`Google callback error: ${err}`);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
}
