import { Injectable, Logger, Inject } from "@nestjs/common";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { YtdlpService } from "../../infrastructure/external/ytdlp.service";
import { extractTopScenes } from "@spikeclip/shared";
import type { HeatmapSpike } from "@spikeclip/shared";

@Injectable()
export class SceneGenerationService {
  private readonly logger = new Logger(SceneGenerationService.name);

  constructor(
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    private readonly ytdlpService: YtdlpService,
  ) {}

  async generateScenes(projectId: string, sourceId: string): Promise<{ sceneCount: number; sourceStatus: string }> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source || source.projectId !== projectId) {
      throw new Error("Source not found");
    }

    await this.sourceRepo.update(sourceId, { sourceStatus: "analyzing" });

    try {
      const metadata = await this.ytdlpService.extractMetadata(source.youtubeUrl);
      const heatmap: HeatmapSpike[] = metadata.heatmap ?? [];

      if (heatmap.length === 0) {
        await this.sourceRepo.update(sourceId, {
          sourceStatus: "error",
          errorMessage: "No heatmap data available for this video",
        });
        return { sceneCount: 0, sourceStatus: "error" };
      }

      await this.sourceRepo.update(sourceId, {
        sourceStatus: "completed",
        analyticsJson: {
          viewCount: metadata.viewCount,
          uploadDate: metadata.uploadDate,
          channelName: metadata.channelName,
        },
      });

      const scenes = extractTopScenes(heatmap);

      let rank = 0;
      for (const scene of scenes) {
        rank++;
        await this.sceneRepo.create({
          projectId,
          sourceId,
          startTime: scene.start_time,
          endTime: scene.end_time,
          duration: scene.duration,
          score: scene.score,
          rank,
          analysisJson: {
            peakIntensity: scene.peak_intensity,
            avgIntensity: scene.avg_intensity,
            confidence: scene.confidence,
            capped: scene.capped,
          },
        });
      }

      this.logger.log(`Generated ${scenes.length} scenes for source ${sourceId}`);
      return { sceneCount: scenes.length, sourceStatus: "completed" };
    } catch (error) {
      await this.sourceRepo.update(sourceId, {
        sourceStatus: "error",
        errorMessage: error instanceof Error ? error.message : "Analysis failed",
      });
      throw error;
    }
  }
}
