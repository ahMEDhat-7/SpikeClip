import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { UserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { Inject } from "@nestjs/common";
import { PlanTier, PLAN_LIMITS, UNLIMITED, PrismaErrorCode } from "@spikeclip/shared";

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
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
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
    clipsUsed: number;
    clipsLimit: number;
  }> {
    let user = await this.userRepository.findByOAuthProvider(profile.provider, profile.providerId);

    if (!user) {
      const existingByEmail = await this.userRepository.findByEmail(profile.email);
      if (existingByEmail) {
        user = await this.userRepository.linkOAuthProvider(existingByEmail.id, profile.provider, profile.providerId);
      } else {
        try {
          const limits = PLAN_LIMITS[PlanTier.FREE];
          user = await this.userRepository.createOAuthUser({
            id: randomUUID(),
            email: profile.email,
            name: profile.name,
            oauthProvider: profile.provider,
            oauthProviderId: profile.providerId,
            plan: PlanTier.FREE,
            analysesUsed: 0,
            analysesLimit: limits.analysesLimit,
            scenesLimit: limits.scenesLimit,
            clipsLimit: limits.clipsLimit,
          });
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            "code" in err &&
            (err as { code?: string }).code === PrismaErrorCode.UNIQUE_CONSTRAINT
          ) {
            user = await this.userRepository.findByOAuthProvider(profile.provider, profile.providerId);
            if (!user) {
              user = await this.userRepository.findByEmail(profile.email);
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
    const user = await this.userRepository.findById(userId);
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
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (user.plan === PlanTier.PRO || user.plan === PlanTier.TEAM) return true;
    await this.userRepository.checkAndResetMonthlyUsage(user.id, user.analysesResetAt);
    return this.userRepository.canUserAnalyze(userId);
  }

  async incrementAnalyses(userId: string): Promise<boolean> {
    await this.userRepository.checkAndResetMonthlyUsage(userId);
    return this.userRepository.incrementAnalyses(userId);
  }

  async decrementAnalyses(userId: string): Promise<boolean> {
    return this.userRepository.decrementAnalyses(userId);
  }

  async checkCanExportClips(userId: string, count: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (user.plan === PlanTier.PRO || user.plan === PlanTier.TEAM) return true;
    await this.userRepository.checkAndResetMonthlyUsage(user.id, user.analysesResetAt);
    const refreshed = await this.userRepository.findById(userId);
    if (!refreshed) return false;
    return this.userRepository.canUserExportClips(userId, count);
  }

  async incrementClips(userId: string, count: number): Promise<boolean> {
    return this.userRepository.incrementClips(userId, count);
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
    clipsUsed: number;
    clipsLimit: number;
    createdAt: Date;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const updated = await this.userRepository.update(userId, { name: data.name });

    this.logger.log(`Profile updated for user: ${this.maskEmail(updated.email)}`);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name ?? "",
      plan: updated.plan,
      analysesUsed: updated.analysesUsed,
      analysesLimit: updated.analysesLimit,
      scenesLimit: updated.scenesLimit,
      clipsUsed: updated.clipsUsed,
      clipsLimit: updated.clipsLimit,
      createdAt: updated.createdAt,
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return "***";
    return `${local[0]}***@${domain}`;
  }
}
