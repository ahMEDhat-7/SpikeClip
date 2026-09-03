import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRepository, OAuthUserData } from "../../../domain/repositories/user.repository";
import { User } from "../../../domain/entities/user.entity";
import { type PlanTierValue, UNLIMITED } from "@spikeclip/shared";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    stripeCustomerId: string | null;
    analysesUsed: number;
    analysesLimit: number;
    scenesLimit: number;
    clipsUsed: number;
    clipsLimit: number;
    analysesResetAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      user.id,
      user.email,
      user.name ?? undefined,
      user.plan as PlanTierValue,
      user.stripeCustomerId ?? undefined,
      user.analysesUsed,
      user.analysesLimit,
      user.scenesLimit,
      user.clipsUsed,
      user.clipsLimit,
      user.analysesResetAt ?? undefined,
      user.createdAt,
      user.updatedAt
    );
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.toEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.toEntity(user);
  }

  async findByStripeCustomerId(customerId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return null;
    return this.toEntity(user);
  }

  async findByOAuthProvider(provider: string, providerId: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { oauthProvider: provider, oauthProviderId: providerId },
    });
    if (!user) return null;
    return this.toEntity(user);
  }

  async linkOAuthProvider(userId: string, provider: string, providerId: string): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { oauthProvider: provider, oauthProviderId: providerId },
    });
    return this.toEntity(updated);
  }

  async createOAuthUser(data: OAuthUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        oauthProvider: data.oauthProvider,
        oauthProviderId: data.oauthProviderId,
        plan: data.plan,
        analysesUsed: data.analysesUsed,
        analysesLimit: data.analysesLimit,
        scenesLimit: data.scenesLimit,
        clipsLimit: data.clipsLimit,
      },
    });
    return this.toEntity(created);
  }

  async create(user: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        stripeCustomerId: user.stripeCustomerId,
        analysesUsed: user.analysesUsed,
        analysesLimit: user.analysesLimit,
        scenesLimit: user.scenesLimit,
        clipsUsed: user.clipsUsed,
        clipsLimit: user.clipsLimit,
      },
    });

    return this.toEntity(created);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.plan !== undefined && { plan: data.plan }),
        ...(data.stripeCustomerId !== undefined && { stripeCustomerId: data.stripeCustomerId }),
        ...(data.analysesUsed !== undefined && { analysesUsed: data.analysesUsed }),
        ...(data.analysesLimit !== undefined && { analysesLimit: data.analysesLimit }),
        ...(data.scenesLimit !== undefined && { scenesLimit: data.scenesLimit }),
        ...(data.clipsUsed !== undefined && { clipsUsed: data.clipsUsed }),
        ...(data.clipsLimit !== undefined && { clipsLimit: data.clipsLimit }),
      },
    });

    return this.toEntity(updated);
  }

  async save(user: User): Promise<User> {
    return this.update(user.id, user);
  }

  async checkAndResetMonthlyUsage(userId: string, resetAt?: Date | null): Promise<void> {
    const now = new Date();
    const shouldReset =
      !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear();
    if (shouldReset) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { analysesUsed: 0, clipsUsed: 0, analysesResetAt: now },
      });
    }
  }

  async canUserAnalyze(userId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT 1 as count FROM "User"
      WHERE id = ${userId} AND ("analysesUsed" < "analysesLimit" OR "analysesLimit" = ${UNLIMITED})
    `;
    return result.length > 0;
  }

  async canUserExportClips(userId: string, count: number): Promise<boolean> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT 1 as count FROM "User"
      WHERE id = ${userId} AND ("clipsUsed" + ${count} <= "clipsLimit" OR "clipsLimit" = ${UNLIMITED})
    `;
    return result.length > 0;
  }

  async incrementAnalyses(userId: string): Promise<boolean> {
    const result = await this.prisma.$executeRaw`
      UPDATE "User" SET "analysesUsed" = "analysesUsed" + 1
      WHERE id = ${userId}
        AND ("analysesUsed" < "analysesLimit" OR "analysesLimit" = ${UNLIMITED})
    `;
    return result > 0;
  }

  async decrementAnalyses(userId: string): Promise<boolean> {
    const result = await this.prisma.$executeRaw`
      UPDATE "User" SET "analysesUsed" = GREATEST("analysesUsed" - 1, 0)
      WHERE id = ${userId}
    `;
    return result > 0;
  }

  async incrementClips(userId: string, count: number): Promise<boolean> {
    const result = await this.prisma.$executeRaw`
      UPDATE "User" SET "clipsUsed" = "clipsUsed" + ${count}
      WHERE id = ${userId}
        AND ("clipsUsed" + ${count} <= "clipsLimit" OR "clipsLimit" = ${UNLIMITED})
    `;
    return result > 0;
  }
}
