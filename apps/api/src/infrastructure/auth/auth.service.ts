import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { PrismaService } from "../database/prisma.service";

interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<{
    accessToken: string;
    userId: string;
    email: string;
    name: string;
    plan: string;
    analysesUsed: number;
    analysesLimit: number;
    scenesLimit: number;
  }> {
    // Try to find by provider+id first
    let user = await this.prisma.user.findFirst({
      where: { oauthProvider: profile.provider, oauthProviderId: profile.providerId },
    });

    if (!user) {
      // Try to find by email and link the OAuth provider
      const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { oauthProvider: profile.provider, oauthProviderId: profile.providerId },
        });
      } else {
        // Create new user — use upsert to handle race conditions
        try {
          user = await this.prisma.user.create({
            data: {
              id: randomUUID(),
              email: profile.email,
              name: profile.name,
              oauthProvider: profile.provider,
              oauthProviderId: profile.providerId,
              plan: "free",
              analysesUsed: 0,
              analysesLimit: 3,
              scenesLimit: 3,
            },
          });
        } catch (err: unknown) {
          // Race condition: another request created the user, try finding again
          if (
            err instanceof Error &&
            "code" in err &&
            (err as { code?: string }).code === "P2002"
          ) {
            user = await this.prisma.user.findFirst({
              where: { oauthProvider: profile.provider, oauthProviderId: profile.providerId },
            });
            if (!user) {
              user = await this.prisma.user.findUnique({ where: { email: profile.email } });
            }
          } else {
            throw err;
          }
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException("Failed to create or find user");
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    this.logger.log(`OAuth login: ${profile.provider} user=${this.maskEmail(user.email)}`);

    return {
      accessToken,
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      plan: user.plan,
      analysesUsed: user.analysesUsed,
      analysesLimit: user.analysesLimit,
      scenesLimit: user.scenesLimit,
      clipsUsed: user.clipsUsed,
      clipsLimit: user.clipsLimit,
    };
  }

  async getProfile(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    plan: string;
    analysesUsed: number;
    analysesLimit: number;
    scenesLimit: number;
    clipsUsed: number;
    clipsLimit: number;
    createdAt: Date;
  } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      plan: user.plan,
      analysesUsed: user.analysesUsed,
      analysesLimit: user.analysesLimit,
      scenesLimit: user.scenesLimit,
      clipsUsed: user.clipsUsed,
      clipsLimit: user.clipsLimit,
      createdAt: user.createdAt,
    };
  }

  async checkCanAnalyze(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    if (user.plan === "pro" || user.plan === "team") return true;
    await this.checkAndResetMonthlyUsage(user.id, user.analysesResetAt);
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT 1 as count FROM "User"
      WHERE id = ${userId} AND ("analysesUsed" < "analysesLimit" OR "analysesLimit" = -1)
    `;
    return result.length > 0;
  }

  async incrementAnalyses(userId: string): Promise<boolean> {
    await this.checkAndResetMonthlyUsage(userId);
    const result = await this.prisma.$executeRaw`
      UPDATE "User" SET "analysesUsed" = "analysesUsed" + 1
      WHERE id = ${userId}
        AND ("analysesUsed" < "analysesLimit" OR "analysesLimit" = -1)
    `;
    return result > 0;
  }

  private async checkAndResetMonthlyUsage(userId: string, resetAt?: Date | null): Promise<void> {
    const now = new Date();
    const shouldReset = !resetAt || (resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear());
    if (shouldReset) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { analysesUsed: 0, analysesResetAt: now },
      });
    }
  }

  async updateProfile(
    userId: string,
    data: { name?: string }
  ): Promise<{
    id: string;
    email: string;
    name: string;
    plan: string;
    analysesUsed: number;
    analysesLimit: number;
    scenesLimit: number;
    createdAt: Date;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
      },
    });

    this.logger.log(`Profile updated for user: ${this.maskEmail(updated.email)}`);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name ?? "",
      plan: updated.plan,
      analysesUsed: updated.analysesUsed,
      analysesLimit: updated.analysesLimit,
      scenesLimit: updated.scenesLimit,
      createdAt: updated.createdAt,
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    return `${local[0]}***@${domain}`;
  }
}
