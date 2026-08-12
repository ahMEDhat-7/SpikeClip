import type { PlatformId } from "@spikeclips/shared";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export const LLM_PROVIDER = "LLM_PROVIDER";

export interface LLMProvider {
  complete(messages: ChatMessage[], opts?: LLMRequestOptions): Promise<string>;
}
