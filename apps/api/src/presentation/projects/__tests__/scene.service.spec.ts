import { SceneService } from "../scene.service";

function createMockSceneRepo(scenes: unknown[] = []) {
  return {
    findById: jest.fn().mockResolvedValue(scenes[0] ?? null),
    findByProjectId: jest.fn().mockResolvedValue(scenes),
    findBySourceId: jest.fn().mockResolvedValue(scenes),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ id, ...data, toRaw: () => ({ id, ...data }) })
    ),
    delete: jest.fn().mockResolvedValue(undefined),
    countByProjectId: jest.fn().mockResolvedValue(scenes.length),
  };
}

function createMockSourceRepo(source: unknown = null) {
  return {
    findById: jest.fn().mockResolvedValue(source),
    update: jest.fn().mockResolvedValue(undefined),
    findByProjectId: jest.fn().mockResolvedValue([]),
    findByProjectIdAndVideoId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockProjectRepo(project: unknown = { id: "project-1", userId: "user-1" }) {
  return {
    findById: jest.fn().mockResolvedValue(project),
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    findByUserId: jest.fn().mockResolvedValue([]),
  };
}

function createMockQueueService() {
  return {
    addAnalysisJob: jest.fn().mockResolvedValue(undefined),
    addExportJob: jest.fn().mockResolvedValue(undefined),
    addSourceJob: jest.fn().mockResolvedValue("bull-job-1"),
    addSceneGenerationJob: jest.fn().mockResolvedValue("scene-bull-job-1"),
    getJobCounts: jest.fn().mockResolvedValue({
      analysis: { waiting: 0, active: 0, completed: 0, failed: 0 },
      export: { waiting: 0, active: 0, completed: 0, failed: 0 },
      source: { waiting: 0, active: 0, completed: 0, failed: 0 },
    }),
  };
}

describe("SceneService", () => {
  describe("list", () => {
    it("returns scenes for owned project", async () => {
      const sceneRepo = createMockSceneRepo([
        { id: "s1", projectId: "project-1", toRaw: () => ({ id: "s1" }) },
      ]);
      const projectRepo = createMockProjectRepo();
      const service = new SceneService(sceneRepo as any, createMockSourceRepo() as any, projectRepo as any, createMockQueueService() as any);

      const result = await service.list("user-1", "project-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s1");
    });

    it("throws for unowned project", async () => {
      const projectRepo = createMockProjectRepo({ id: "project-1", userId: "other-user" });
      const service = new SceneService(createMockSceneRepo() as any, createMockSourceRepo() as any, projectRepo as any, createMockQueueService() as any);

      await expect(service.list("user-1", "project-1")).rejects.toThrow("Project not found");
    });
  });

  describe("generateScenes", () => {
    it("enqueues scene generation job", async () => {
      const source = { id: "source-1", projectId: "project-1", sourceStatus: "ready" };
      const queueService = createMockQueueService();
      const service = new SceneService(
        createMockSceneRepo() as any,
        createMockSourceRepo(source) as any,
        createMockProjectRepo() as any,
        queueService as any,
      );

      const result = await service.generateScenes("user-1", "project-1", "source-1");
      expect(result.status).toBe("pending");
      expect(result.bullJobId).toBe("scene-bull-job-1");
      expect(queueService.addSceneGenerationJob).toHaveBeenCalledWith({
        sourceId: "source-1",
        projectId: "project-1",
        userId: "user-1",
      });
    });

    it("returns already_running if source is analyzing", async () => {
      const source = { id: "source-1", projectId: "project-1", sourceStatus: "analyzing" };
      const service = new SceneService(
        createMockSceneRepo() as any,
        createMockSourceRepo(source) as any,
        createMockProjectRepo() as any,
        createMockQueueService() as any,
      );

      const result = await service.generateScenes("user-1", "project-1", "source-1");
      expect(result.status).toBe("already_running");
    });

    it("throws for non-existent source", async () => {
      const service = new SceneService(
        createMockSceneRepo() as any,
        createMockSourceRepo(null) as any,
        createMockProjectRepo() as any,
        createMockQueueService() as any,
      );

      await expect(service.generateScenes("user-1", "project-1", "missing")).rejects.toThrow("Source not found");
    });
  });

  describe("update", () => {
    it("updates scene times and recalculates duration", async () => {
      const scene = { id: "scene-1", projectId: "project-1", startTime: 10, endTime: 20, duration: 10, toRaw: () => ({ id: "scene-1" }) };
      const sceneRepo = createMockSceneRepo([scene]);
      const service = new SceneService(sceneRepo as any, createMockSourceRepo() as any, createMockProjectRepo() as any, createMockQueueService() as any);

      await service.update("user-1", "project-1", "scene-1", { startTime: 5, endTime: 15 });
      expect(sceneRepo.update).toHaveBeenCalledWith("scene-1", expect.objectContaining({ duration: 10 }));
    });
  });

  describe("remove", () => {
    it("deletes scene", async () => {
      const scene = { id: "scene-1", projectId: "project-1" };
      const sceneRepo = createMockSceneRepo([scene]);
      const service = new SceneService(sceneRepo as any, createMockSourceRepo() as any, createMockProjectRepo() as any, createMockQueueService() as any);

      await service.remove("user-1", "project-1", "scene-1");
      expect(sceneRepo.delete).toHaveBeenCalledWith("scene-1");
    });
  });
});
