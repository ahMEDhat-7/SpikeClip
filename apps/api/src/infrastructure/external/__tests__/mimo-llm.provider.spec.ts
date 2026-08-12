import { MimoLLMProvider } from "../mimo-llm.provider";
import { ConfigService } from "@nestjs/config";
import https from "https";

jest.mock("https");

function mockConfig(overrides: Record<string, any> = {}): ConfigService {
  return {
    get: (key: string, def?: any) => {
      const config: Record<string, any> = {
        LLM_API_URL: "https://opencode.ai/zen/v1/chat/completions",
        LLM_MODEL: "mimo-v2.5-free",
        LLM_MAX_TOKENS: 3000,
        LLM_TEMPERATURE: 0.2,
        LLM_TIMEOUT_MS: 30000,
        LLM_API_KEY: "test-key",
        ...overrides,
      };
      return config[key] ?? def;
    },
  } as unknown as ConfigService;
}

function setupResponseBody(body: string) {
  const resOn = jest.fn((event: string, cb: any) => {
    if (event === "data") cb(body);
    if (event === "end") cb();
  });
  const req = { on: jest.fn(), write: jest.fn(), end: jest.fn(), destroy: jest.fn() };
  (https.request as jest.Mock).mockImplementation((_opts: any, cb: any) => {
    cb({ on: resOn });
    return req;
  });
  return req;
}

describe("MimoLLMProvider", () => {
  afterEach(() => jest.clearAllMocks());

  it("posts to the configured endpoint and returns content", async () => {
    const req = setupResponseBody(JSON.stringify({ choices: [{ message: { content: "hello" } }] }));
    const provider = new MimoLLMProvider(mockConfig());
    const out = await provider.complete([{ role: "user", content: "hi" }]);
    expect(out).toBe("hello");
    expect(https.request).toHaveBeenCalled();
    expect(req.write).toHaveBeenCalled();
    const body = JSON.parse(req.write.mock.calls[0][0]);
    expect(body.model).toBe("mimo-v2.5-free");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("throws when LLM_API_KEY is missing", async () => {
    const provider = new MimoLLMProvider(mockConfig({ LLM_API_KEY: undefined }));
    await expect(provider.complete([{ role: "user", content: "hi" }])).rejects.toThrow("LLM_API_KEY is required");
  });

  it("throws on API error response", async () => {
    setupResponseBody(JSON.stringify({ error: { message: "bad" } }));
    const provider = new MimoLLMProvider(mockConfig());
    await expect(provider.complete([{ role: "user", content: "hi" }])).rejects.toThrow("LLM API error");
  });
});
