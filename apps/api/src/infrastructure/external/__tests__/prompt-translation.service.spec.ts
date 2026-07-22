import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PromptTranslationService } from "../prompt-translation.service";

describe("PromptTranslationService", () => {
  let service: PromptTranslationService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        LLM_PROVIDER: "openai",
        LLM_MODEL: "gpt-4o-mini",
        LLM_MAX_TOKENS: 2000,
        LLM_TEMPERATURE: 0.2,
        LLM_TIMEOUT_MS: 15000,
        LLM_API_KEY: "test-key",
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptTranslationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PromptTranslationService>(PromptTranslationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("translate", () => {
    const context = {
      platform: "youtube-shorts" as const,
      aspectRatio: "9:16",
      maxDuration: 60,
      sceneStart: 0,
      sceneEnd: 15,
      sceneDuration: 15,
      availableAssets: [],
    };

    it("should handle LLM API errors gracefully", async () => {
      // Mock the LLM client to throw an error
      jest.spyOn(service as any, "getLLMClient").mockRejectedValue(new Error("API Error"));

      const result = await service.translate("Add captions", context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return clarification for ambiguous prompts", async () => {
      const clarificationResponse = {
        type: "clarification" as const,
        question: "What text would you like for the captions?",
        suggestions: ["Add 'Hello World'", "Add 'Welcome'"],
      };

      jest.spyOn(service as any, "getLLMClient").mockResolvedValue({
        chat: jest.fn().mockResolvedValue({
          content: JSON.stringify(clarificationResponse),
        }),
      });

      const result = await service.translate("Add some captions", context);

      expect(result.success).toBe(true);
      expect(result.clarification).toBeDefined();
      expect(result.clarification?.type).toBe("clarification");
    });

    it("should parse valid action responses", async () => {
      const actionsResponse = [
        {
          action: "add_captions",
          text: "Hello",
          font: "inter",
          size: 48,
          color: "#FFFFFF",
          position: "center",
          start: 0,
          end: 5,
          animation: "none",
          style: "normal",
          opacity: 1,
        },
      ];

      jest.spyOn(service as any, "getLLMClient").mockResolvedValue({
        chat: jest.fn().mockResolvedValue({
          content: JSON.stringify(actionsResponse),
        }),
      });

      const result = await service.translate("Add 'Hello' from 0-5s", context);

      expect(result.success).toBe(true);
      expect(result.actions).toBeDefined();
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0].action).toBe("add_captions");
    });

    it("should clamp out-of-range values", async () => {
      const actionsResponse = [
        {
          action: "mix_audio",
          volume: 1.5,
          originalVolume: -0.5,
          fadeIn: 0,
          fadeOut: 0,
          startTime: 0,
          tone: "normal",
        },
      ];

      jest.spyOn(service as any, "getLLMClient").mockResolvedValue({
        chat: jest.fn().mockResolvedValue({
          content: JSON.stringify(actionsResponse),
        }),
      });

      const result = await service.translate("Mix audio at max volume", context);

      expect(result.success).toBe(true);
      expect(result.actions?.[0]).toMatchObject({
        volume: 1,
        originalVolume: 0,
      });
    });

    it("should validate timing within scene bounds", async () => {
      const actionsResponse = [
        {
          action: "add_captions",
          text: "Test",
          start: -5,
          end: 20,
          font: "inter",
          size: 48,
          color: "#FFFFFF",
          position: "center",
          animation: "none",
          style: "normal",
          opacity: 1,
        },
      ];

      jest.spyOn(service as any, "getLLMClient").mockResolvedValue({
        chat: jest.fn().mockResolvedValue({
          content: JSON.stringify(actionsResponse),
        }),
      });

      const result = await service.translate("Add captions outside bounds", context);

      expect(result.success).toBe(true);
      // Timing should be clamped to scene bounds
      const action = result.actions?.[0] as any;
      expect(action.start).toBeGreaterThanOrEqual(0);
      expect(action.end).toBeLessThanOrEqual(15);
    });
  });
});
