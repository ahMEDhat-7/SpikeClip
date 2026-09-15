import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { StudioAction, StudioActionsArraySchema } from "@spikeclip/shared";

interface PresetMatch {
  presetId: string;
  name: string;
  genre: string;
  confidence: number;
  template: StudioAction[];
}

interface PatternPresetRecord {
  id: string;
  name: string;
  description: string;
  genre: string;
  studioActionTemplate: unknown;
  sourceType: string;
  usageCount: number;
  avgPerformanceScore: number | null;
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  talking_head: ["talking", "speaking", "monologue", "solo", "commentary", "explainer", "educational", "tutorial"],
  podcast: ["podcast", "interview", "conversation", "discussion", "panel", "chat", "talk show"],
  reaction: ["reaction", "react", "response", "review", "commentary", "reaction video"],
  meme: ["meme", "funny", "comedy", "humor", "parody", "skit", "joke", "viral"],
  walkthrough: ["walkthrough", "guide", "tutorial", "how-to", "step by step", "demo", "demonstration", "instructions"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  karaoke: ["karaoke", "sing-along", "sing along", "lyrics", "word by word"],
  bold: ["bold", "strong", "impact", "big text", "large text", "loud"],
  minimal: ["minimal", "clean", "simple", "subtle", "understated"],
  energetic: ["energetic", "fast", "punchy", "dynamic", "exciting", "hype"],
  professional: ["professional", "corporate", "formal", "business", "clean"],
  cinematic: ["cinematic", "dramatic", "movie", "film", "epic"],
};

@Injectable()
export class PatternPresetService {
  private readonly logger = new Logger(PatternPresetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async matchPreset(prompt: string): Promise<PresetMatch | null> {
    const normalizedPrompt = prompt.toLowerCase().trim();

    const presets = await this.prisma.patternPreset.findMany({
      orderBy: [{ usageCount: "desc" }, { avgPerformanceScore: "desc" }],
    });

    if (presets.length === 0) {
      this.logger.debug("No pattern presets found in database");
      return null;
    }

    let bestMatch: PresetMatch | null = null;
    let bestScore = 0;

    for (const preset of presets) {
      const score = this.calculateMatchScore(normalizedPrompt, preset);
      if (score > bestScore && score >= 0.4) {
        bestScore = score;
        bestMatch = {
          presetId: preset.id,
          name: preset.name,
          genre: preset.genre,
          confidence: score,
          template: preset.studioActionTemplate as StudioAction[],
        };
      }
    }

    if (bestMatch) {
      await this.prisma.patternPreset.update({
        where: { id: bestMatch.presetId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    return bestMatch;
  }

  private calculateMatchScore(prompt: string, preset: PatternPresetRecord): number {
    let score = 0;

    const genreKeywords = GENRE_KEYWORDS[preset.genre] ?? [];
    for (const keyword of genreKeywords) {
      if (prompt.includes(keyword)) {
        score += 0.3;
        break;
      }
    }

    const presetNameWords = preset.name.toLowerCase().split(/\s+/);
    for (const word of presetNameWords) {
      if (word.length > 3 && prompt.includes(word)) {
        score += 0.15;
      }
    }

    const presetDescWords = preset.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    let descMatches = 0;
    for (const word of presetDescWords) {
      if (prompt.includes(word)) descMatches++;
    }
    if (presetDescWords.length > 0) {
      score += (descMatches / presetDescWords.length) * 0.2;
    }

    if (preset.avgPerformanceScore != null && preset.avgPerformanceScore > 0.7) {
      score += 0.1;
    }

    if (preset.sourceType === "mined_from_performance") {
      score += 0.05;
    }

    return Math.min(score, 1);
  }

  async extractOverrides(
    prompt: string,
    template: StudioAction[],
  ): Promise<StudioAction[]> {
    const overrides = { ...template };

    for (const action of Object.values(overrides)) {
      if (typeof action !== "object" || action === null) continue;
      const act = action as Record<string, unknown>;

      if (prompt.includes("bigger") || prompt.includes("larger")) {
        if (typeof act.size === "number") act.size = Math.min(120, act.size * 1.5);
        if (typeof act.fontSize === "number") act.fontSize = Math.min(120, act.fontSize * 1.5);
      }

      if (prompt.includes("smaller")) {
        if (typeof act.size === "number") act.size = Math.max(12, act.size * 0.7);
        if (typeof act.fontSize === "number") act.fontSize = Math.max(12, act.fontSize * 0.7);
      }

      if (prompt.includes("brighter") || prompt.includes("light")) {
        if (typeof act.color === "string") act.color = "#FFFFFF";
      }

      if (prompt.includes("darker")) {
        if (typeof act.color === "string") act.color = "#000000";
      }

      if (prompt.includes("faster") || prompt.includes("speed up")) {
        if (typeof act.rate === "number") act.rate = Math.min(4, act.rate * 1.5);
      }

      if (prompt.includes("slower")) {
        if (typeof act.rate === "number") act.rate = Math.max(0.25, act.rate * 0.7);
      }

      if (prompt.includes("remove") || prompt.includes("delete")) {
        act._remove = true;
      }
    }

    const result = Object.values(overrides).filter(
      (action) => typeof action === "object" && action !== null && !(action as Record<string, unknown>)._remove,
    ) as StudioAction[];

    const validated = StudioActionsArraySchema.safeParse(result);
    return validated.success ? validated.data : template;
  }

  async createPreset(data: {
    name: string;
    description: string;
    genre: string;
    studioActionTemplate: StudioAction[];
    sourceType?: string;
  }): Promise<string> {
    const preset = await this.prisma.patternPreset.create({
      data: {
        name: data.name,
        description: data.description,
        genre: data.genre,
        studioActionTemplate: data.studioActionTemplate,
        sourceType: data.sourceType ?? "curated",
      },
    });
    return preset.id;
  }

  async listPresets(genre?: string): Promise<PatternPresetRecord[]> {
    return this.prisma.patternPreset.findMany({
      where: genre ? { genre } : undefined,
      orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    });
  }

  async updatePerformanceScore(presetId: string, score: number): Promise<void> {
    const preset = await this.prisma.patternPreset.findUnique({ where: { id: presetId } });
    if (!preset) return;

    const currentAvg = preset.avgPerformanceScore ?? 0;
    const count = preset.usageCount;
    const newAvg = count > 0 ? (currentAvg * count + score) / (count + 1) : score;

    await this.prisma.patternPreset.update({
      where: { id: presetId },
      data: { avgPerformanceScore: newAvg },
    });
  }
}
