import { BadRequestException } from "@nestjs/common";
import { StudioService } from "../studio.service";
import type { StudioAction, JobStatus } from "@spikeclips/shared";

const storageMock = {
  upload: jest.fn().mockResolvedValue(undefined),
};

const prismaMock = {
  clip: {
    create: jest.fn().mockResolvedValue({ id: "clip-1", fileUrl: "clips/job-1/abc.mp4" }),
  },
};

function makeService(jobRepo: { findById: jest.Mock; update?: jest.Mock }) {
  return new StudioService(
    {} as never,
    {} as never,
    {} as never,
    jobRepo as never,
    { get: jest.fn(), set: jest.fn() } as never,
    storageMock as never,
    prismaMock as never
  );
}

const ownedJob = {
  id: "job-1",
  userId: "user-1",
  url: "https://youtube.com/watch?v=abc",
  status: "completed" as JobStatus,
};

const edits: Record<number, StudioAction[]> = {
  0: [{ action: "add_captions", text: "Hi", font: "inter", size: 48, color: "#FFFFFF", position: "center", start: 0, end: 10, animation: "none", style: "normal", opacity: 1, backgroundEnabled: false, strokeWidth: 2, shadowRadius: 2 }],
};

describe("StudioService.saveActions", () => {
  it("persists edits for a job owned by the user", async () => {
    const jobRepo = { findById: jest.fn().mockResolvedValue(ownedJob), update: jest.fn().mockResolvedValue(ownedJob) };
    const service = makeService(jobRepo);

    const result = await service.saveActions("user-1", "job-1", edits);

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { studioEdits: edits });
    expect(result).toBe(ownedJob);
  });

  it("throws when the job does not exist", async () => {
    const jobRepo = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const service = makeService(jobRepo);

    await expect(service.saveActions("user-1", "job-1", edits)).rejects.toBeInstanceOf(BadRequestException);
    expect(jobRepo.update).not.toHaveBeenCalled();
  });

  it("throws when the job belongs to another user", async () => {
    const jobRepo = {
      findById: jest.fn().mockResolvedValue({ ...ownedJob, userId: "user-2" }),
      update: jest.fn(),
    };
    const service = makeService(jobRepo);

    await expect(service.saveActions("user-1", "job-1", edits)).rejects.toBeInstanceOf(BadRequestException);
    expect(jobRepo.update).not.toHaveBeenCalled();
  });

  it("allows clearing edits with null", async () => {
    const jobRepo = { findById: jest.fn().mockResolvedValue(ownedJob), update: jest.fn().mockResolvedValue(ownedJob) };
    const service = makeService(jobRepo);

    await service.saveActions("user-1", "job-1", null);

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { studioEdits: null });
  });
});

describe("StudioService project persistence", () => {
  it("returns the stored project for the owner", async () => {
    const project = { tracks: [] };
    const jobRepo = { findById: jest.fn().mockResolvedValue({ ...ownedJob, project }) };
    const service = makeService(jobRepo);

    expect(await service.getProject("user-1", "job-1")).toBe(project);
  });

  it("throws when saving project for another user", async () => {
    const jobRepo = {
      findById: jest.fn().mockResolvedValue({ ...ownedJob, userId: "user-2" }),
      update: jest.fn(),
    };
    const service = makeService(jobRepo);

    await expect(service.saveProject("user-1", "job-1", {})).rejects.toBeInstanceOf(BadRequestException);
    expect(jobRepo.update).not.toHaveBeenCalled();
  });

  it("persists the project for the owner", async () => {
    const jobRepo = { findById: jest.fn().mockResolvedValue(ownedJob), update: jest.fn().mockResolvedValue(ownedJob) };
    const service = makeService(jobRepo);
    const project = { foo: "bar" };

    await service.saveProject("user-1", "job-1", project);

    expect(jobRepo.update).toHaveBeenCalledWith("job-1", { project });
  });
});

describe("StudioService.saveExportedClip", () => {
  const file = { buffer: Buffer.from("data"), originalname: "clip.mp4", mimetype: "video/mp4" };

  beforeEach(() => {
    storageMock.upload.mockClear();
    prismaMock.clip.create.mockClear();
  });

  it("uploads the clip and registers a completed Clip", async () => {
    const jobRepo = { findById: jest.fn().mockResolvedValue(ownedJob), update: jest.fn() };
    const service = makeService(jobRepo);

    const result = await service.saveExportedClip("user-1", "job-1", file, {
      startTime: 0,
      endTime: 15,
      duration: 15,
      peakIntensity: 0.9,
    });

    expect(storageMock.upload).toHaveBeenCalledTimes(1);
    const [buffer, key, contentType] = storageMock.upload.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(key).toMatch(/^clips\/job-1\//);
    expect(contentType).toBe("video/mp4");
    expect(prismaMock.clip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobId: "job-1",
        status: "completed",
        fileUrl: key,
        duration: 15,
        peakIntensity: 0.9,
      }),
    });
    expect(result.id).toBe("clip-1");
    expect(result.fileUrl).toMatch(/^clips\/job-1\//);
  });

  it("throws when the job belongs to another user", async () => {
    const jobRepo = {
      findById: jest.fn().mockResolvedValue({ ...ownedJob, userId: "user-2" }),
      update: jest.fn(),
    };
    const service = makeService(jobRepo);

    await expect(service.saveExportedClip("user-1", "job-1", file, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });
});
