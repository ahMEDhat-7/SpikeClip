import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { request as httpsRequest } from "https";
import {
  StudioAction,
  StudioActionsArraySchema,
  ClarificationResponseSchema,
  ClarificationResponse,
  PlatformId,
} from "@spikeclips/shared";
import { RedisService } from "../redis/redis.service";

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

const CACHE_TTL_SECONDS = 600;

@Injectable()
export class PromptTranslationService {
  private readonly logger = new Logger(PromptTranslationService.name);
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly verbosePrompt: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.apiUrl = this.config.get("LLM_API_URL", "https://opencode.ai/zen/v1/chat/completions");
    this.model = this.config.get("LLM_MODEL", "mimo-v2.5-free");
    this.maxTokens = Number(this.config.get("LLM_MAX_TOKENS", "3000"));
    this.temperature = Number(this.config.get("LLM_TEMPERATURE", "0.2"));
    this.timeoutMs = Number(this.config.get("LLM_TIMEOUT_MS", "30000"));
    this.verbosePrompt = this.config.get("LLM_VERBOSE_PROMPT", "false") === "true";
  }

  private getCacheKey(prompt: string, context: TranslationContext): string {
    const raw = `${prompt}|${context.sceneStart}|${context.sceneEnd}|${context.platform}`;
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    return `llm:translate:${hash}`;
  }

  private async callLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.config.get<string>("LLM_API_KEY");
    if (!apiKey) throw new Error("LLM_API_KEY is required");

    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const url = new URL(this.apiUrl);

    try {
      const responseBody = await new Promise<string>((resolve, reject) => {
        const req = httpsRequest(
          {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            timeout: this.timeoutMs,
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(data));
          }
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
    } catch (error) {
      if (error instanceof Error && error.message.includes("LLM API error")) {
        throw error;
      }
      throw new Error(`LLM request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildCompactPrompt(context: TranslationContext): string {
    return `Translate editing instructions to JSON. Return ONLY a JSON array. If ambiguous, return {"type":"clarification","question":"...","suggestions":["..."]}.

Actions: add_captions(text,font|inter,impact,bebas,playfair,mono,size 12-120,color hex,start,end,position|top,center,bottom,animation|fade,slide,pop,typewriter,none,style|normal,bold,outlined,shadow,neon,opacity 0-1,backgroundColor hex,backgroundEnabled bool,strokeWidth number,shadowRadius number,x 0-100,y 0-100), mix_audio(volume 0-1,originalVolume 0-1,fadeIn,fadeOut,startTime,tone|normal,bass_boost,treble_boost,warm), apply_effect(type|vignette,zoom_in,zoom_out,blur,sharpen,sepia,bw,glitch,glow,intensity 0-1,startTime,endTime), set_speed(rate 0.25-4.0,preservePitch bool), add_overlay(assetKey,x,y,scale 0.1-2,opacity 0-1,startTime,endTime), set_transition(type|fade,slide_left,slide_right,zoom,wipe,duration,position|start,end), add_background(color hex,startTime,endTime), trim(startTime,endTime).

Platform: ${context.platform} (${context.aspectRatio}, max ${context.maxDuration}s). Scene: ${context.sceneStart}-${context.sceneEnd}s (duration ${context.sceneDuration}s). Available assets: ${context.availableAssets.length > 0 ? context.availableAssets.join(",") : "none"}.
Defaults: font=inter, size=48, color=#FFFFFF. Apply to full scene if no timing. Actions execute sequentially. Times must be within ${context.sceneStart}-${context.sceneEnd}.
Example: "make it 2x" → [{"action":"set_speed","rate":2}]`;
  }

  private buildVerbosePrompt(context: TranslationContext): string {
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

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse LLM response as JSON");
    }

    if (parsed && typeof parsed === "object" && "type" in parsed && (parsed as Record<string, unknown>).type === "clarification") {
      const obj = parsed as Record<string, unknown>;
      try {
        return ClarificationResponseSchema.parse(parsed);
      } catch {
        return {
          type: "clarification",
          question: (obj.question as string) || "Could you be more specific?",
          suggestions: Array.isArray(obj.suggestions) && (obj.suggestions as unknown[]).length > 0
            ? (obj.suggestions as string[]).slice(0, 5)
            : ["Try rephrasing", "Be more specific"],
        };
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 1 && parsed[0] && typeof parsed[0] === "object" && "type" in parsed[0] && (parsed[0] as Record<string, unknown>).type === "clarification") {
        const first = parsed[0] as Record<string, unknown>;
        try {
          return ClarificationResponseSchema.parse(parsed[0]);
        } catch {
          return {
            type: "clarification",
            question: (first.question as string) || "Could you be more specific?",
            suggestions: Array.isArray(first.suggestions) && (first.suggestions as unknown[]).length > 0
              ? (first.suggestions as string[]).slice(0, 5)
              : ["Try rephrasing", "Be more specific"],
          };
        }
      }

      const validated = StudioActionsArraySchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      throw new Error("LLM response did not match any valid action format");
    }

    throw new Error("LLM response is neither an array nor a clarification object");
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
    const cacheKey = this.getCacheKey(prompt, context);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for: ${cacheKey}`);
        const actions = JSON.parse(cached) as StudioAction[];
        return { success: true, actions };
      }
    } catch {
      this.logger.debug("Cache read failed, proceeding with LLM call");
    }

    try {
      const systemPrompt = this.verbosePrompt
        ? this.buildVerbosePrompt(context)
        : this.buildCompactPrompt(context);

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

      try {
        await this.redis.set(cacheKey, JSON.stringify(clampedActions), CACHE_TTL_SECONDS);
      } catch {
        this.logger.debug("Cache write failed");
      }

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
