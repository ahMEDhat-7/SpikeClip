import { SceneGenerationService } from "../scene-generation.service";

function createMockSourceRepo(overrides: { source?: Record<string, unknown> | null } = {}) {
  const source = overrides.source ?? {
    id: "source-1",
    projectId: "project-1",
    youtubeVideoId: "abc123",
    youtubeUrl: "https://youtube.com/watch?v=abc123",
    sourceStatus: "ready",
  };
  return {
    findById: jest.fn().mockImplementation(() => Promise.resolve(source)),
    update: jest.fn().mockResolvedValue(undefined),
    findByProjectId: jest.fn().mockResolvedValue([]),
    findByProjectIdAndVideoId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockSceneRepo() {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByProjectId: jest.fn().mockResolvedValue([]),
    findBySourceId: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    countByProjectId: jest.fn().mockResolvedValue(0),
  };
}

function createMockYtdlp(heatmap: Array<{ start_time: number; end_time: number; value: number }> = []) {
  return {
    extractMetadata: jest.fn().mockResolvedValue({
      heatmap,
      viewCount: 100000,
      uploadDate: "20260101",
      channelName: "Test Channel",
    }),
    downloadSection: jest.fn().mockResolvedValue(undefined),
  };
}

describe("SceneGenerationService", () => {
  it("generates scenes from heatmap data", async () => {
    const sourceRepo = createMockSourceRepo();
    const sceneRepo = createMockSceneRepo();
    const ytdlp = createMockYtdlp([
      { start_time: 10, end_time: 20, value: 0.9 },
      { start_time: 30, end_time: 40, value: 0.8 },
    ]);

    const service = new SceneGenerationService(
      sourceRepo as any,
      sceneRepo as any,
      ytdlp as any,
    );

    const result = await service.generateScenes("project-1", "source-1");

    expect(result.sourceStatus).toBe("completed");
    expect(result.sceneCount).toBeGreaterThanOrEqual(1);
    expect(sourceRepo.update).toHaveBeenCalledWith("source-1", { sourceStatus: "analyzing" });
    expect(sourceRepo.update).toHaveBeenCalledWith("source-1", expect.objectContaining({ sourceStatus: "completed" }));
    expect(sceneRepo.create).toHaveBeenCalled();
  });

  it("returns error status when no heatmap data", async () => {
    const sourceRepo = createMockSourceRepo();
    const sceneRepo = createMockSceneRepo();
    const ytdlp = createMockYtdlp([]);

    const service = new SceneGenerationService(
      sourceRepo as any,
      sceneRepo as any,
      ytdlp as any,
    );

    const result = await service.generateScenes("project-1", "source-1");

    expect(result.sourceStatus).toBe("error");
    expect(result.sceneCount).toBe(0);
    expect(sourceRepo.update).toHaveBeenCalledWith("source-1", expect.objectContaining({ sourceStatus: "error" }));
  });

  it("throws when source not found", async () => {
    const sceneRepo = createMockSceneRepo();
    const ytdlp = createMockYtdlp();
    const sourceRepo = {
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const service = new SceneGenerationService(
      sourceRepo as any,
      sceneRepo as any,
      ytdlp as any,
    );

    await expect(service.generateScenes("project-1", "missing")).rejects.toThrow("Source not found");
  });

  it("throws when source belongs to different project", async () => {
    const sceneRepo = createMockSceneRepo();
    const ytdlp = createMockYtdlp();
    const sourceRepo = {
      findById: jest.fn().mockResolvedValue({ id: "source-1", projectId: "other-project", youtubeUrl: "url" }),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const service = new SceneGenerationService(
      sourceRepo as any,
      sceneRepo as any,
      ytdlp as any,
    );

    await expect(service.generateScenes("project-1", "source-1")).rejects.toThrow("Source not found");
  });

  it("sets error status on ytdlp failure", async () => {
    const sourceRepo = createMockSourceRepo();
    const sceneRepo = createMockSceneRepo();
    const ytdlp = {
      extractMetadata: jest.fn().mockRejectedValue(new Error("Network timeout")),
    };

    const service = new SceneGenerationService(
      sourceRepo as any,
      sceneRepo as any,
      ytdlp as any,
    );

    await expect(service.generateScenes("project-1", "source-1")).rejects.toThrow("Network timeout");
    expect(sourceRepo.update).toHaveBeenCalledWith("source-1", expect.objectContaining({
      sourceStatus: "error",
      errorMessage: "Network timeout",
    }));
  });
});
