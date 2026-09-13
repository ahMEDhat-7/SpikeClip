import { Injectable, Logger } from "@nestjs/common";

const DAILY_QUOTA_LIMIT = 10_000;

const QUOTA_COSTS: Record<string, number> = {
  "youtube.channels.list": 1,
  "youtube.search.list": 100,
  "youtube.videos.list": 1,
  "youtube.playlistItems.list": 1,
  "youtubeAnalytics.reports.query": 1,
};

interface QuotaUsage {
  date: string;
  used: number;
  requests: number;
}

@Injectable()
export class YouTubeQuotaGuard {
  private readonly logger = new Logger(YouTubeQuotaGuard.name);
  private usage: QuotaUsage;
  private readonly dailyLimit: number;

  constructor() {
    this.dailyLimit = parseInt(process.env.YOUTUBE_DAILY_QUOTA_LIMIT || String(DAILY_QUOTA_LIMIT), 10);
    this.usage = this.resetUsage();
  }

  private resetUsage(): QuotaUsage {
    return {
      date: new Date().toISOString().slice(0, 10),
      used: 0,
      requests: 0,
    };
  }

  private ensureFreshDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.usage.date !== today) {
      this.logger.log(`Quota day rollover: ${this.usage.date} -> ${today} (used ${this.usage.used}/${this.dailyLimit})`);
      this.usage = this.resetUsage();
    }
  }

  canMakeCall(apiMethod: string): boolean {
    this.ensureFreshDay();
    const cost = QUOTA_COSTS[apiMethod] ?? 1;
    return this.usage.used + cost <= this.dailyLimit;
  }

  getRemainingQuota(): number {
    this.ensureFreshDay();
    return Math.max(0, this.dailyLimit - this.usage.used);
  }

  getUsage(): { used: number; limit: number; remaining: number; date: string } {
    this.ensureFreshDay();
    return {
      used: this.usage.used,
      limit: this.dailyLimit,
      remaining: this.getRemainingQuota(),
      date: this.usage.date,
    };
  }

  recordCall(apiMethod: string): void {
    this.ensureFreshDay();
    const cost = QUOTA_COSTS[apiMethod] ?? 1;
    this.usage.used += cost;
    this.usage.requests += 1;

    if (this.usage.used >= this.dailyLimit * 0.9) {
      this.logger.warn(`YouTube quota at ${Math.round((this.usage.used / this.dailyLimit) * 100)}% (${this.usage.used}/${this.dailyLimit})`);
    }
  }

  rejectIfExhausted(apiMethod: string): void {
    if (!this.canMakeCall(apiMethod)) {
      const remaining = this.getRemainingQuota();
      throw new Error(
        `YouTube API quota exhausted. ${remaining} units remaining out of ${this.dailyLimit}. ` +
        `Call "${apiMethod}" costs ${QUOTA_COSTS[apiMethod] ?? 1} units. Try again tomorrow or request a quota increase.`
      );
    }
  }
}
