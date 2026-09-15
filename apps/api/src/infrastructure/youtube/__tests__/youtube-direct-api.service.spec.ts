import { YoutubeDirectApiService } from "../youtube-direct-api.service";

const mockTokenVault = {
  getAccessToken: jest.fn(),
  getTokens: jest.fn(),
};

const mockQuotaGuard = {
  rejectIfExhausted: jest.fn(),
  recordCall: jest.fn(),
  canMakeCall: jest.fn().mockReturnValue(true),
};

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("YoutubeDirectApiService", () => {
  let service: YoutubeDirectApiService;

  beforeEach(() => {
    service = new YoutubeDirectApiService(mockTokenVault as any, mockQuotaGuard as any);
    service.setTokenProvider({
      getAccessToken: jest.fn().mockResolvedValue("test-token"),
      refreshToken: jest.fn().mockResolvedValue("refreshed-token"),
    });
    jest.clearAllMocks();
  });

  describe("getChannel", () => {
    it("should return channel data from YouTube API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "UC123",
            snippet: { title: "Test Channel", description: "A test channel", thumbnails: { default: { url: "thumb.jpg" } } },
            statistics: { viewCount: "1000", subscriberCount: "500", videoCount: "10" },
          }],
        }),
      });

      const channel = await service.getChannel();
      expect(channel.id).toBe("UC123");
      expect(channel.title).toBe("Test Channel");
      expect(channel.subscriberCount).toBe("500");
      expect(mockQuotaGuard.recordCall).toHaveBeenCalledWith("youtube.channels.list");
    });

    it("should throw when no channel found", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });

      await expect(service.getChannel()).rejects.toThrow("No YouTube channel found");
    });
  });

  describe("getVideo", () => {
    it("should return video data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: "vid123",
            snippet: { title: "Test Video", description: "Desc", thumbnails: { medium: { url: "thumb.jpg" } }, publishedAt: "2026-01-01" },
            statistics: { viewCount: "5000", likeCount: "100", commentCount: "10" },
            contentDetails: { duration: "PT5M30S" },
            status: { privacyStatus: "public" },
          }],
        }),
      });

      const video = await service.getVideo("vid123");
      expect(video.id).toBe("vid123");
      expect(video.title).toBe("Test Video");
      expect(video.duration).toBe("PT5M30S");
    });
  });

  describe("getChannelAnalytics", () => {
    it("should return analytics data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rows: [[1000, 500, 120, 75, 50, 10, 5, 20, 2]],
        }),
      });

      const analytics = await service.getChannelAnalytics("2026-01-01", "2026-01-31");
      expect(analytics.views).toBe(1000);
      expect(analytics.estimatedMinutesWatched).toBe(500);
      expect(analytics.subscribersGained).toBe(20);
    });
  });

  describe("error handling", () => {
    it("should throw on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Quota exceeded"),
      });

      await expect(service.getChannel()).rejects.toThrow("YouTube API error 403");
    });

    it("should attempt token refresh on 401", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve("Unauthorized") })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            items: [{
              id: "UC123",
              snippet: { title: "Channel" },
              statistics: { viewCount: "0", subscriberCount: "0", videoCount: "0" },
            }],
          }),
        });

      const channel = await service.getChannel();
      expect(channel.id).toBe("UC123");
    });
  });
});
