import { renderHook, act } from "@testing-library/react";
import { useExportClips } from "@/application/hooks/use-export-clips";
import { ApiProvider } from "@/application/providers/api-provider";
import { jobApi } from "@/infrastructure/api/job-api.client";

jest.mock("@/infrastructure/api/job-api.client", () => ({
  jobApi: {
    exportClips: jest.fn(),
    getClips: jest.fn(),
  },
  authApi: {},
}));

jest.mock("@/infrastructure/api/auth-api.client", () => ({
  authApi: {},
}));

const mockJobApi = jobApi as jest.Mocked<typeof jobApi>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <ApiProvider>{children}</ApiProvider>;
}

describe("useExportClips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default values", () => {
    const { result } = renderHook(() => useExportClips("job-123"), { wrapper });
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.clips).toEqual([]);
  });

  it("calls exportClips with scenes and starts polling", async () => {
    mockJobApi.exportClips.mockResolvedValue({
      jobId: "job-123",
      clipJobIds: ["clip-1", "clip-2"],
    });
    mockJobApi.getClips.mockResolvedValue([]);

    const { result } = renderHook(() => useExportClips("job-123"), { wrapper });

    await act(async () => {
      await result.current.exportClips([
        { start_time: 0, end_time: 5 },
        { start_time: 10, end_time: 15 },
      ]);
    });

    expect(mockJobApi.exportClips).toHaveBeenCalledWith("job-123", [
      { start_time: 0, end_time: 5 },
      { start_time: 10, end_time: 15 },
    ], undefined);
    expect(result.current.isExporting).toBe(true);
  });

  it("handles export error", async () => {
    mockJobApi.exportClips.mockRejectedValue(new Error("Export failed"));

    const { result } = renderHook(() => useExportClips("job-123"), { wrapper });

    await act(async () => {
      await result.current.exportClips([{ start_time: 0, end_time: 5 }]);
    });

    expect(result.current.error).toBe("Export failed");
    expect(result.current.isExporting).toBe(false);
  });

  it("does nothing when jobId is null", async () => {
    const { result } = renderHook(() => useExportClips(null), { wrapper });
    await act(async () => {
      await result.current.exportClips([{ start_time: 0, end_time: 5 }]);
    });
    expect(mockJobApi.exportClips).not.toHaveBeenCalled();
  });

  it("loadClips fetches clips for a job", async () => {
    mockJobApi.getClips.mockResolvedValue([
      { id: "c1", jobId: "job-123", sceneIndex: 0, startTime: 0, endTime: 5, status: "completed", createdAt: "" },
    ]);

    const { result } = renderHook(() => useExportClips("job-123"), { wrapper });
    await act(async () => {
      await result.current.loadClips();
    });

    expect(result.current.clips).toHaveLength(1);
    expect(mockJobApi.getClips).toHaveBeenCalledWith("job-123");
  });
});
