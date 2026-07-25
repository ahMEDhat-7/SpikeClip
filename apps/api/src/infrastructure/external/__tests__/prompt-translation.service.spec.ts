import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PromptTranslationService } from "../prompt-translation.service";
import { RedisService } from "../../redis/redis.service";

jest.mock("child_process");
jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe("PromptTranslationService", () => {
  let service: PromptTranslationService;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        LLM_API_URL: "https://opencode.ai/zen/v1/chat/completions",
        LLM_MODEL: "mimo-v2.5-free",
        LLM_MAX_TOKENS: 3000,
        LLM_TEMPERATURE: 0.2,
        LLM_TIMEOUT_MS: 30000,
        LLM_API_KEY: "test-key",
        LLM_VERBOSE_PROMPT: "false",
      };
      return config[key] ?? defaultValue;
    }),
  };

  const context = {
    platform: "youtube-shorts" as const,
    aspectRatio: "9:16",
    maxDuration: 60,
    sceneStart: 100,
    sceneEnd: 120,
    sceneDuration: 20,
    availableAssets: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptTranslationService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PromptTranslationService>(PromptTranslationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("translate", () => {
    it("should parse valid action responses", async () => {
      const actions = [{ action: "set_speed", rate: 2, preservePitch: true }];
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(actions));

      const result = await service.translate("make it 2x", context);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0].action).toBe("set_speed");
    });

    it("should handle clarification in bare object form", async () => {
      const clarification = {
        type: "clarification",
        question: "What text?",
        suggestions: ["Hello", "World"],
      };
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(clarification));

      const result = await service.translate("add captions", context);

      expect(result.success).toBe(true);
      expect(result.clarification).toBeDefined();
      expect(result.clarification?.question).toBe("What text?");
      expect(result.clarification?.suggestions).toEqual(["Hello", "World"]);
    });

    it("should handle clarification wrapped in array", async () => {
      const clarification = [
        {
          type: "clarification",
          question: "Which effect?",
          suggestions: ["Glitch", "Neon"],
        },
      ];
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(clarification));

      const result = await service.translate("do something cool", context);

      expect(result.success).toBe(true);
      expect(result.clarification).toBeDefined();
      expect(result.clarification?.question).toBe("Which effect?");
    });

    it("should handle malformed clarification gracefully", async () => {
      const malformed = { type: "clarification", question: "What would you like?" };
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(malformed));

      const result = await service.translate("add something", context);

      expect(result.success).toBe(true);
      expect(result.clarification).toBeDefined();
      expect(result.clarification?.suggestions).toEqual(["Try rephrasing", "Be more specific"]);
    });

    it("should clamp out-of-range values", async () => {
      const actions = [
        {
          action: "mix_audio",
          volume: 1.5,
          originalVolume: -0.5,
          fadeIn: 0,
          fadeOut: 0,
          startTime: 100,
          tone: "normal",
        },
      ];
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(actions));
      jest.spyOn(service as any, "parseLLMResponse").mockReturnValue(actions);

      const result = await service.translate("mix audio", context);

      expect(result.success).toBe(true);
      expect(result.actions?.[0]).toMatchObject({ volume: 1, originalVolume: 0 });
    });

    it("should clamp timing to scene bounds", async () => {
      const actions = [
        {
          action: "add_captions",
          text: "Test",
          start: -5,
          end: 125,
          font: "inter",
          size: 48,
          color: "#FFFFFF",
          position: "center",
          animation: "none",
          style: "normal",
          opacity: 1,
        },
      ];
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(actions));
      jest.spyOn(service as any, "parseLLMResponse").mockReturnValue(actions);

      const result = await service.translate("add captions", context);

      expect(result.success).toBe(true);
      const action = result.actions?.[0] as any;
      expect(action.start).toBeGreaterThanOrEqual(100);
      expect(action.end).toBeLessThanOrEqual(120);
    });

    it("should return error on LLM failure", async () => {
      jest.spyOn(service as any, "callLLM").mockRejectedValue(new Error("Connection refused"));

      const result = await service.translate("make it 2x", context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    });

    it("should return error on invalid JSON", async () => {
      jest.spyOn(service as any, "callLLM").mockResolvedValue("not json at all");

      const result = await service.translate("make it 2x", context);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse LLM response as JSON");
    });

    it("should return cache hit on second call", async () => {
      const actions = [{ action: "set_speed", rate: 2, preservePitch: true }];
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(actions));
      const callLLMSpy = jest.spyOn(service as any, "callLLM");

      const result = await service.translate("make it 2x", context);

      expect(result.success).toBe(true);
      expect(result.actions).toEqual(actions);
      expect(callLLMSpy).not.toHaveBeenCalled();
    });

    it("should cache successful action results", async () => {
      const actions = [{ action: "set_speed", rate: 2, preservePitch: true }];
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(actions));

      await service.translate("make it 2x", context);

      expect(mockRedis.set).toHaveBeenCalled();
      const [key, value, ttl] = mockRedis.set.mock.calls[0];
      expect(key).toMatch(/^llm:translate:/);
      expect(ttl).toBe(600);
      expect(JSON.parse(value)).toEqual(actions);
    });

    it("should not cache clarification results", async () => {
      const clarification = {
        type: "clarification",
        question: "What?",
        suggestions: ["A", "B"],
      };
      jest.spyOn(service as any, "callLLM").mockResolvedValue(JSON.stringify(clarification));

      await service.translate("ambiguous", context);

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
