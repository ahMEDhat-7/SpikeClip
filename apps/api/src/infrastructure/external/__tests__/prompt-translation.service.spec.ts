import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PromptTranslationService } from "../prompt-translation.service";
import { RedisService } from "../../redis/redis.service";
import { LLM_PROVIDER, ChatMessage } from "../llm-provider.interface";
import { StudioEditContext, StudioAction } from "@spikeclips/shared";

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: jest.fn((key: string, def?: any) => {
    const config: Record<string, any> = {
      LLM_API_URL: "https://opencode.ai/zen/v1/chat/completions",
      LLM_MODEL: "mimo-v2.5-free",
      LLM_MAX_TOKENS: 3000,
      LLM_TEMPERATURE: 0.2,
      LLM_TIMEOUT_MS: 30000,
      LLM_API_KEY: "test-key",
      LLM_VERBOSE_PROMPT: "false",
    };
    return config[key] ?? def;
  }),
};

const mockLlm = {
  complete: jest.fn(),
};

const context: StudioEditContext = {
  platform: "youtube-shorts",
  aspectRatio: "9:16",
  maxDuration: 60,
  sceneStart: 100,
  sceneEnd: 120,
  sceneDuration: 20,
  availableAssets: [],
  currentActions: [],
  captions: [],
  music: null,
  template: null,
  availableTemplates: [],
};

describe("PromptTranslationService", () => {
  let service: PromptTranslationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptTranslationService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
        { provide: LLM_PROVIDER, useValue: mockLlm },
      ],
    }).compile();
    service = module.get<PromptTranslationService>(PromptTranslationService);
  });

  it("should translate prompt into actions", async () => {
    mockLlm.complete.mockResolvedValue(
      JSON.stringify({
        actions: [
          { action: "add_captions", text: "Highlight", start: 0, end: 3, font: "impact", size: 72, color: "#FFFFFF", position: "center", style: "bold" },
        ],
      }),
    );
    const result = await service.translate("Add bold white captions", context);
    expect(result.success).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(result.actions![0].action).toBe("add_captions");
    expect(result.summary).toContain("Highlight");
  });

  it("should handle clarification", async () => {
    mockLlm.complete.mockResolvedValue(
      JSON.stringify({
        type: "clarification",
        question: "What style of captions do you want?",
        suggestions: ["Bold", "Outline"],
      }),
    );
    const result = await service.translate("Make it better", context);
    expect(result.success).toBe(true);
    expect(result.clarification).toBeDefined();
    expect(result.clarification!.question).toContain("caption");
    expect(result.actions).toBeUndefined();
  });

  it("should inject current scene state into the system prompt", async () => {
    const ctx: StudioEditContext = {
      ...context,
      currentActions: [
        { action: "add_captions", text: "Existing", start: 0, end: 3, font: "impact", size: 72, color: "#FFFFFF", position: "center", style: "bold" } as StudioAction,
      ],
    };
    mockLlm.complete.mockResolvedValue(JSON.stringify({ actions: [] }));
    await service.translate("make them bigger", ctx);
    const systemPrompt = (mockLlm.complete.mock.calls[0][0] as ChatMessage[])[0].content;
    expect(systemPrompt).toContain("Existing");
  });

  it("should include conversation history in messages", async () => {
    const history: ChatMessage[] = [
      { role: "user", content: "add captions" },
      { role: "assistant", content: "done" },
    ];
    mockLlm.complete.mockResolvedValue(JSON.stringify({ actions: [] }));
    await service.translate("now make them red", context, history);
    const messages = mockLlm.complete.mock.calls[0][0] as ChatMessage[];
    expect(messages).toHaveLength(4);
    expect(messages[1]).toEqual({ role: "user", content: "add captions" });
    expect(messages[2]).toEqual({ role: "assistant", content: "done" });
    expect(messages[3]).toEqual({ role: "user", content: "now make them red" });
  });

  it("should handle malformed LLM response", async () => {
    mockLlm.complete.mockResolvedValue("not json at all");
    const result = await service.translate("do something", context);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should use cache when available", async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify([
        { action: "add_captions", text: "Cached", start: 0, end: 3, font: "inter", size: 48, color: "#FFFFFF", position: "center", style: "normal" },
      ]),
    );
    const result = await service.translate("anything", context);
    expect(result.success).toBe(true);
    expect(mockLlm.complete).not.toHaveBeenCalled();
    expect(result.summary).toContain("Cached");
  });
});
