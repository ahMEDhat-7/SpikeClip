import { Injectable, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/auth/google/callback`,
      scope: ["email", "profile"],
      state: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: { id: string; emails?: { value: string }[]; displayName?: string },
    done: VerifyCallback
  ): Promise<void> {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      done(new Error("No email from Google"), undefined);
      return;
    }

    try {
      const user = await this.authService.findOrCreateOAuthUser({
        provider: "google",
        providerId: id,
        email,
        name: displayName || email.split("@")[0],
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
