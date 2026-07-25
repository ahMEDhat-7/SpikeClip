import { Job } from "../job.entity";

describe("Job (e2e)", () => {
  const baseJob = {
    id: "job-123",
    userId: "user-456",
    url: "https://youtube.com/watch?v=test",
  };

  describe("markProcessing", () => {
    it("sets status to processing", () => {
      const job = new Job(baseJob.id, baseJob.userId, baseJob.url);
      job.markProcessing();
      expect(job.status).toBe("processing");
    });
  });

  describe("markCompleted", () => {
    it("sets status to completed with scenes", () => {
      const job = new Job(baseJob.id, baseJob.userId, baseJob.url);
      const scenes = [
        { start_time: 0, end_time: 5, duration: 5, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
      ];
      job.markCompleted(scenes);
      expect(job.status).toBe("completed");
      expect(job.scenes).toEqual(scenes);
      expect(job.completedAt).toBeDefined();
    });
  });

  describe("markFailed", () => {
    it("sets status to failed with error message", () => {
      const job = new Job(baseJob.id, baseJob.userId, baseJob.url);
      job.markFailed("Network error");
      expect(job.status).toBe("failed");
      expect(job.errorMessage).toBe("Network error");
      expect(job.completedAt).toBeDefined();
    });
  });
});
