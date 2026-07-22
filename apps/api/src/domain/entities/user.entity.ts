import { PlanTier } from "@spikeclips/shared";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public name?: string,
    public plan: PlanTier = "free",
    public stripeCustomerId?: string,
    public analysesUsed: number = 0,
    public analysesLimit: number = 3,
    public scenesLimit: number = 3,
    public clipsUsed: number = 0,
    public clipsLimit: number = 2,
    public analysesResetAt?: Date,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  canAnalyze(): boolean {
    if (this.analysesLimit === -1) return true;
    return this.analysesUsed < this.analysesLimit;
  }

  canExportClips(count: number = 1): boolean {
    if (this.clipsLimit === -1) return true;
    return this.clipsUsed + count <= this.clipsLimit;
  }

  incrementUsage(): void {
    this.analysesUsed += 1;
    this.updatedAt = new Date();
  }

  incrementClipUsage(count: number = 1): void {
    this.clipsUsed += count;
    this.updatedAt = new Date();
  }

  getClipsRemaining(): number {
    if (this.clipsLimit === -1) return -1;
    return Math.max(0, this.clipsLimit - this.clipsUsed);
  }
}
