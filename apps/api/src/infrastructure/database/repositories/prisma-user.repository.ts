import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { User } from "../../../domain/entities/user.entity";
import { PlanTier } from "@spikeclips/shared";

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
      user.plan as PlanTier,
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
}
