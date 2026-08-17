import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import {
  StudioAction,
  StudioActionsArraySchema,
  ClarificationResponseSchema,
  ClarificationResponse,
  StudioEditContext,
  describeAction,
} from "@spikeclips/shared";
import { RedisService } from "../redis/redis.service";
import { LLM_PROVIDER, LLMProvider, ChatMessage } from "./llm-provider.interface";

interface TranslationResult {
  success: boolean;
  actions?: StudioAction[];
  clarification?: ClarificationResponse;
  summary?: string;
  error?: string;
}

const CACHE_TTL_SECONDS = 600;

@Injectable()
export class PromptTranslationService {
  private readonly logger = new Logger(PromptTranslationService.name);
  private readonly verbosePrompt: boolean;

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LLMProvider,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.verbosePrompt = this.config.get("LLM_VERBOSE_PROMPT", "false") === "true";
  }

  private getCacheKey(prompt: string, context: StudioEditContext): string {
    const signature = `${prompt}|${context.sceneStart}|${context.sceneEnd}|${context.platform}|${context.currentActions.length}|${context.template?.id ?? ""}`;
    const hash = createHash("sha256").update(signature).digest("hex").slice(0, 16);
    return `llm:translate:${hash}`;
  }

  private buildStateSummary(context: StudioEditContext): string {
    const parts: string[] = [];

    if (context.currentActions.length > 0) {
      parts.push(
        `Current actions on this scene:\n${context.currentActions.map((a, i) => `  ${i + 1}. ${describeAction(a)}`).join("\n")}`,
      );
    } else {
      parts.push("Current actions on this scene: none yet.");
    }

    if (context.captions.length > 0) {
      parts.push(`Existing captions: ${context.captions.map((c) => `"${c.text}"`).join(", ")}`);
    }

    if (context.music) {
      parts.push(`Music track: ${context.music.name} at ${Math.round(context.music.volume * 100)}% volume`);
    }

    if (context.template) {
      parts.push(`Active template: ${context.template.name}`);
    }

    if (context.availableTemplates.length > 0) {
      parts.push(`Available templates: ${context.availableTemplates.map((t) => t.name).join(", ")}`);
    }

    return parts.join("\n");
  }

  private buildCompactPrompt(context: StudioEditContext): string {
    return `Translate editing instructions to JSON. Return ONLY a JSON array. If ambiguous, return {"type":"clarification","question":"...","suggestions":["..."]}.

Actions: add_captions(text,font|inter,impact,bebas,playfair,mono,size 12-120,color hex,start,end,position|top,center,bottom,animation|fade,slide,pop,typewriter,none,style|normal,bold,outlined,shadow,neon,opacity 0-1,backgroundColor hex,backgroundEnabled bool,strokeWidth number,shadowRadius number,x 0-100,y 0-100), mix_audio(volume 0-1,originalVolume 0-1,fadeIn,fadeOut,startTime,tone|normal,bass_boost,treble_boost,warm), apply_effect(type|vignette,zoom_in,zoom_out,blur,sharpen,sepia,bw,glitch,glow,intensity 0-1,startTime,endTime), set_speed(rate 0.25-4.0,preservePitch bool), add_overlay(assetKey,x,y,scale 0.1-2,opacity 0-1,startTime,endTime), set_transition(type|fade,slide_left,slide_right,zoom,wipe,duration,position|start,end), add_background(color hex,startTime,endTime), trim(startTime,endTime).

Platform: ${context.platform} (${context.aspectRatio}, max ${context.maxDuration}s). Scene: ${context.sceneStart}-${context.sceneEnd}s (duration ${context.sceneDuration}s). Available assets: ${context.availableAssets.length > 0 ? context.availableAssets.join(",") : "none"}.
Defaults: font=inter, size=48, color=#FFFFFF. Apply to full scene if no timing. Actions execute sequentially. Times must be within ${context.sceneStart}-${context.sceneEnd}.
Example: "make it 2x" → [{"action":"set_speed","rate":2}].

# Current scene state
${this.buildStateSummary(context)}`;
  }

  private buildVerbosePrompt(context: StudioEditContext): string {
    return `You are Clutch's editing assistant. You translate natural language editing instructions into structured JSON actions.

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
Parameters: rate (0.25-4.0).

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

## Current scene state
${this.buildStateSummary(context)}

## Rules
1. Return ONLY a JSON array of actions. No prose, no markdown.
2. If the user's request is ambiguous, return a clarification object instead.
3. Time values must be within the scene's range (${context.sceneStart}-${context.sceneEnd}).
4. Respect platform duration limits.
5. Default font: "inter", default size: 48, default color: "#FFFFFF".
6. If the user doesn't specify timing, apply to the full scene duration.
7. Multiple actions of the same type are allowed (e.g., two caption blocks).
8. Order matters — actions execute sequentially.
9. Reference the current scene state when the user says "bigger", "faster", "remove", etc.`;
  }

  private parseLLMResponse(content: string): StudioAction[] | ClarificationResponse {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse LLM response as JSON");
    }

    const asClarification = (obj: Record<string, unknown>): ClarificationResponse => {
      try {
        return ClarificationResponseSchema.parse(obj);
      } catch {
        return {
          type: "clarification",
          question: (obj.question as string) || "Could you be more specific?",
          suggestions:
            Array.isArray(obj.suggestions) && (obj.suggestions as unknown[]).length > 0
              ? (obj.suggestions as string[]).slice(0, 5)
              : ["Try rephrasing", "Be more specific"],
        };
      }
    };

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if (obj.type === "clarification") {
        return asClarification(obj);
      }
      // Some models wrap the array in an object.
      if (Array.isArray(obj.actions)) {
        parsed = obj.actions;
      } else if (Array.isArray(obj.data)) {
        parsed = obj.data;
      }
    }

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return [] as StudioAction[];
      }

      if (
        parsed.length === 1 &&
        parsed[0] &&
        typeof parsed[0] === "object" &&
        (parsed[0] as Record<string, unknown>).type === "clarification"
      ) {
        return asClarification(parsed[0] as Record<string, unknown>);
      }

      const validated = StudioActionsArraySchema.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      throw new Error("LLM response did not match any valid action format");
    }

    throw new Error("LLM response is neither an array nor a clarification object");
  }

  private clampActions(actions: StudioAction[], context: StudioEditContext): StudioAction[] {
    return actions.map((action) => {
      const clamped = { ...action } as Record<string, unknown>;

      const clampTime = (key: string) => {
        if (typeof clamped[key] === "number") {
          clamped[key] = Math.max(context.sceneStart, Math.min(clamped[key] as number, context.sceneEnd));
        }
      };

      clampTime("start");
      clampTime("end");
      clampTime("startTime");
      clampTime("endTime");

      const clampUnit = (key: string) => {
        if (typeof clamped[key] === "number") {
          clamped[key] = Math.max(0, Math.min(1, clamped[key] as number));
        }
      };

      clampUnit("volume");
      clampUnit("originalVolume");
      clampUnit("opacity");
      clampUnit("intensity");

      if (typeof clamped.rate === "number") {
        clamped.rate = Math.max(0.25, Math.min(4, clamped.rate as number));
      }

      return clamped as StudioAction;
    });
  }

  async translate(
    prompt: string,
    context: StudioEditContext,
    history: ChatMessage[] = [],
  ): Promise<TranslationResult> {
    const cacheKey = this.getCacheKey(prompt, context);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for: ${cacheKey}`);
        const actions = JSON.parse(cached) as StudioAction[];
        return { success: true, actions, summary: actions.map(describeAction).join("; ") };
      }
    } catch {
      this.logger.debug("Cache read failed, proceeding with LLM call");
    }

    try {
      const systemPrompt = this.verbosePrompt
        ? this.buildVerbosePrompt(context)
        : this.buildCompactPrompt(context);

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: prompt },
      ];

      const content = await this.llm.complete(messages);

      const result = this.parseLLMResponse(content);

      if (!Array.isArray(result)) {
        return { success: true, clarification: result };
      }

      const actions = result;
      const clampedActions = this.clampActions(actions, context);

      try {
        await this.redis.set(cacheKey, JSON.stringify(clampedActions), CACHE_TTL_SECONDS);
      } catch {
        this.logger.debug("Cache write failed");
      }

      return { success: true, actions: clampedActions, summary: clampedActions.map(describeAction).join("; ") };
    } catch (error) {
      this.logger.error(`Translation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during translation",
      };
    }
  }
}
