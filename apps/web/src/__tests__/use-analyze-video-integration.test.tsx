import { renderHook, act } from "@testing-library/react";
import { useAnalyzeVideo } from "@/application/hooks/use-analyze-video";
import { ApiProvider } from "@/application/providers/api-provider";
import { jobApi } from "@/infrastructure/api/job-api.client";

jest.mock("@/infrastructure/api/job-api.client", () => ({
  jobApi: {
    createJob: jest.fn(),
    getJob: jest.fn(),
    processJob: jest.fn(),
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

describe("useAnalyzeVideo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default values", () => {
    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("creates and processes a job", async () => {
    const mockJob = { id: "job-123", status: "completed", url: "https://youtube.com/watch?v=test" };
    mockJobApi.createJob.mockResolvedValue(mockJob as any);
    mockJobApi.processJob.mockResolvedValue(mockJob as any);

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });

    await act(async () => {
      await result.current.analyze("https://youtube.com/watch?v=test");
    });

    expect(mockJobApi.createJob).toHaveBeenCalledWith("https://youtube.com/watch?v=test");
    expect(mockJobApi.processJob).toHaveBeenCalledWith("job-123");
    expect(result.current.job).toEqual(mockJob);
  });

  it("handles analysis error", async () => {
    mockJobApi.createJob.mockRejectedValue(new Error("Invalid URL"));

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });

    await act(async () => {
      await result.current.analyze("invalid-url");
    });

    expect(result.current.error).toBe("Invalid URL");
    expect(result.current.isLoading).toBe(false);
  });

  it("loads an existing job", async () => {
    const mockJob = { id: "job-123", status: "completed" };
    mockJobApi.getJob.mockResolvedValue(mockJob as any);

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });

    await act(async () => {
      await result.current.loadJob("job-123");
    });

    expect(result.current.job).toEqual(mockJob);
    expect(mockJobApi.getJob).toHaveBeenCalledWith("job-123");
  });

  it("resets state", () => {
    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });
    act(() => { result.current.reset(); });
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
