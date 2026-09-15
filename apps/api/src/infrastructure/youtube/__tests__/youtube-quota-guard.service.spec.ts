import { YouTubeQuotaGuard } from "../youtube-quota-guard.service";

describe("YouTubeQuotaGuard", () => {
  let guard: YouTubeQuotaGuard;

  beforeEach(() => {
    process.env.YOUTUBE_DAILY_QUOTA_LIMIT = "10000";
    guard = new YouTubeQuotaGuard();
  });

  afterEach(() => {
    delete process.env.YOUTUBE_DAILY_QUOTA_LIMIT;
  });

  it("should allow calls when quota is available", () => {
    expect(guard.canMakeCall("youtube.channels.list")).toBe(true);
  });

  it("should track quota usage after recording a call", () => {
    guard.recordCall("youtube.channels.list");
    const usage = guard.getUsage();
    expect(usage.used).toBe(1);
    expect(usage.limit).toBe(10000);
    expect(usage.remaining).toBe(9999);
  });

  it("should apply correct cost for search.list (100 units)", () => {
    guard.recordCall("youtube.search.list");
    const usage = guard.getUsage();
    expect(usage.used).toBe(100);
  });

  it("should apply default cost of 1 for unknown methods", () => {
    guard.recordCall("unknown.method");
    const usage = guard.getUsage();
    expect(usage.used).toBe(1);
  });

  it("should reject calls when quota is exhausted", () => {
    process.env.YOUTUBE_DAILY_QUOTA_LIMIT = "5";
    guard = new YouTubeQuotaGuard();

    guard.recordCall("youtube.channels.list");
    guard.recordCall("youtube.channels.list");
    guard.recordCall("youtube.channels.list");
    guard.recordCall("youtube.channels.list");
    guard.recordCall("youtube.channels.list");

    expect(() => guard.rejectIfExhausted("youtube.channels.list")).toThrow("YouTube API quota exhausted");
  });

  it("should warn at 90% quota usage", () => {
    const loggerSpy = jest.spyOn(require("@nestjs/common").Logger.prototype, "warn");

    process.env.YOUTUBE_DAILY_QUOTA_LIMIT = "10";
    guard = new YouTubeQuotaGuard();

    for (let i = 0; i < 9; i++) {
      guard.recordCall("youtube.channels.list");
    }

    expect(loggerSpy).toHaveBeenCalled();
  });

  it("should report correct remaining quota", () => {
    guard.recordCall("youtube.videos.list");
    guard.recordCall("youtube.videos.list");
    expect(guard.getRemainingQuota()).toBe(9998);
  });
});
