import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { request as httpsRequest } from "https";
import { LLMProvider, ChatMessage, LLMRequestOptions } from "./llm-provider.interface";

@Injectable()
export class MimoLLMProvider implements LLMProvider {
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get("LLM_API_URL", "https://opencode.ai/zen/v1/chat/completions");
    this.model = this.config.get("LLM_MODEL", "mimo-v2.5-free");
    this.maxTokens = Number(this.config.get("LLM_MAX_TOKENS", "3000"));
    this.temperature = Number(this.config.get("LLM_TEMPERATURE", "0.2"));
    this.timeoutMs = Number(this.config.get("LLM_TIMEOUT_MS", "30000"));
  }

  async complete(messages: ChatMessage[], opts?: LLMRequestOptions): Promise<string> {
    const apiKey = this.config.get<string>("LLM_API_KEY");
    if (!apiKey) throw new Error("LLM_API_KEY is required");

    const body = JSON.stringify({
      model: opts?.model ?? this.model,
      messages,
      temperature: opts?.temperature ?? this.temperature,
      max_tokens: opts?.maxTokens ?? this.maxTokens,
    });

    const url = new URL(this.apiUrl);

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = httpsRequest(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: opts?.timeoutMs ?? this.timeoutMs,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });
      req.write(body);
      req.end();
    });

    const data = JSON.parse(responseBody);

    if (data.error) {
      throw new Error(`LLM API error: ${JSON.stringify(data.error)}`);
    }

    return data.choices?.[0]?.message?.content ?? "";
  }
}
