import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  StudioAction,
  StudioActionsArraySchema,
  ClarificationResponseSchema,
  ClarificationResponse,
  PlatformId,
} from "@spikeclips/shared";

interface TranslationContext {
  platform: PlatformId;
  aspectRatio: string;
  maxDuration: number;
  sceneStart: number;
  sceneEnd: number;
  sceneDuration: number;
  availableAssets: string[];
}

interface TranslationResult {
  success: boolean;
  actions?: StudioAction[];
  clarification?: ClarificationResponse;
  error?: string;
}

@Injectable()
export class PromptTranslationService {
  private readonly logger = new Logger(PromptTranslationService.name);
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get("LLM_API_URL", "https://opencode.ai/zen/v1/chat/completions");
    this.model = this.config.get("LLM_MODEL", "mimo-v2.5-free");
    this.maxTokens = this.config.get("LLM_MAX_TOKENS", 2000);
    this.temperature = this.config.get("LLM_TEMPERATURE", 0.2);
    this.timeoutMs = this.config.get("LLM_TIMEOUT_MS", 15000);
  }

  private async callLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.config.get<string>("LLM_API_KEY");
    if (!apiKey) throw new Error("LLM_API_KEY is required");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`LLM API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildSystemPrompt(context: TranslationContext): string {
    return `You are SpikeClip's editing assistant. You translate natural language editing instructions into structured JSON actions.

## Available Actions

### add_captions
Add text overlay to the video.
Parameters: text (required), font (inter|impact|bebas|playfair|mono), size (12-120), color (hex), position (top|center|bottom), start (seconds), end (seconds), animation (fade|slide|pop|typewriter|none), style (normal|bold|outlined|shadow|neon), opacity (0-1), backgroundColor (hex), backgroundEnabled (bool), strokeWidth (number), shadowRadius (number), x (0-100%), y (0-100%).

### mix_audio
Mix background music/audio with the original.
Parameters: volume (0-1), originalVolume (0-1), fadeIn (seconds), fadeOut (seconds), startTime (seconds), tone (normal|bass_boost|treble_boost|warm).

### apply_effect
Apply visual effects.
Parameters: type (vignette|zoom_in|zoom_out|blur|sharpen|sepia|bw|glitch|glow), intensity (0-1), startTime (seconds), endTime (seconds).

### set_speed
Change playback speed.
Parameters: rate (0.25-4.0), preservePitch (bool).

### add_overlay
Add image overlay/watermark.
Parameters: assetKey (string), x (0-100%), y (0-100%), scale (0.1-2.0), opacity (0-1), startTime (seconds), endTime (seconds).

### set_transition
Add transition effect at clip start or end.
Parameters: type (fade|slide_left|slide_right|zoom|wipe), duration (seconds), position (start|end).

### add_background
Add colored background segment.
Parameters: color (hex), startTime (seconds), endTime (seconds).

### trim
Trim the clip to a specific range.
Parameters: startTime (seconds), endTime (seconds).

## Context
- Platform: ${context.platform} (aspect ratio: ${context.aspectRatio}, max duration: ${context.maxDuration}s)
- Scene: ${context.sceneStart}s - ${context.sceneEnd}s (duration: ${context.sceneDuration}s)
- Available assets: ${context.availableAssets.length > 0 ? context.availableAssets.join(", ") : "none"}

## Rules
1. Return ONLY a JSON array of actions. No prose, no markdown.
2. If the user's request is ambiguous, return a clarification object instead.
3. Time values must be within the scene's range (${context.sceneStart}-${context.sceneEnd}).
4. Respect platform duration limits.
5. Default font: "inter", default size: 48, default color: "#FFFFFF".
6. If the user doesn't specify timing, apply to the full scene duration.
7. Multiple actions of the same type are allowed (e.g., two caption blocks).
8. Order matters — actions execute sequentially.`;
  }

  private parseLLMResponse(content: string): StudioAction[] | ClarificationResponse {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse LLM response as JSON");
    }

    if (parsed.type === "clarification") {
      return ClarificationResponseSchema.parse(parsed);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("LLM response is not an array");
    }

    return StudioActionsArraySchema.parse(parsed);
  }

  private clampActions(actions: StudioAction[], context: TranslationContext): StudioAction[] {
    return actions.map((action) => {
      const clamped = { ...action };

      if ("start" in clamped && typeof clamped.start === "number") {
        clamped.start = Math.max(context.sceneStart, Math.min(clamped.start, context.sceneEnd));
      }
      if ("end" in clamped && typeof clamped.end === "number") {
        clamped.end = Math.max(context.sceneStart, Math.min(clamped.end, context.sceneEnd));
      }
      if ("startTime" in clamped && typeof clamped.startTime === "number") {
        clamped.startTime = Math.max(context.sceneStart, Math.min(clamped.startTime, context.sceneEnd));
      }
      if ("endTime" in clamped && typeof clamped.endTime === "number") {
        clamped.endTime = Math.max(context.sceneStart, Math.min(clamped.endTime, context.sceneEnd));
      }
      if ("volume" in clamped && typeof clamped.volume === "number") {
        clamped.volume = Math.max(0, Math.min(1, clamped.volume));
      }
      if ("originalVolume" in clamped && typeof clamped.originalVolume === "number") {
        clamped.originalVolume = Math.max(0, Math.min(1, clamped.originalVolume));
      }
      if ("opacity" in clamped && typeof clamped.opacity === "number") {
        clamped.opacity = Math.max(0, Math.min(1, clamped.opacity));
      }
      if ("intensity" in clamped && typeof clamped.intensity === "number") {
        clamped.intensity = Math.max(0, Math.min(1, clamped.intensity));
      }
      if ("rate" in clamped && typeof clamped.rate === "number") {
        clamped.rate = Math.max(0.25, Math.min(4, clamped.rate));
      }

      return clamped;
    });
  }

  async translate(prompt: string, context: TranslationContext): Promise<TranslationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const content = await this.callLLM([
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]);

      const result = this.parseLLMResponse(content);

      if ("type" in result && result.type === "clarification") {
        return { success: true, clarification: result };
      }

      const actions = result as StudioAction[];
      const clampedActions = this.clampActions(actions, context);

      return { success: true, actions: clampedActions };
    } catch (error) {
      this.logger.error(`Translation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during translation",
      };
    }
  }
}
