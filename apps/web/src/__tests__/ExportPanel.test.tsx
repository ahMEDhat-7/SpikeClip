import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ExportPanel } from "../presentation/components/studio/ExportPanel";

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
];

const defaultProps = {
  platform: { id: "youtube-shorts", name: "YouTube Shorts", icon: "Youtube", aspectRatio: "9:16", maxDuration: 60, description: "Vertical short-form video" } as any,
  scenes: mockScenes,
  selectedScenes: [0, 1],
  captions: [],
  musicTrack: null,
  originalVolume: 1,
  selectedTemplate: null,
  onExport: jest.fn(),
};

describe("ExportPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders summary with platform info", () => {
    render(<ExportPanel {...defaultProps} />);
    expect(screen.getByText("YouTube Shorts")).toBeInTheDocument();
  });

  it("shows format buttons", () => {
    render(<ExportPanel {...defaultProps} />);
    expect(screen.getByText("MP4")).toBeInTheDocument();
    expect(screen.getByText("WebM")).toBeInTheDocument();
  });

  it("shows quality buttons", () => {
    render(<ExportPanel {...defaultProps} />);
    expect(screen.getByText("720p")).toBeInTheDocument();
    expect(screen.getByText("1080p")).toBeInTheDocument();
  });

  it("calls onFormatChange on click", () => {
    const onFormatChange = jest.fn();
    render(<ExportPanel {...defaultProps} onFormatChange={onFormatChange} />);
    fireEvent.click(screen.getByText("WebM"));
    expect(onFormatChange).toHaveBeenCalledWith("webm");
  });

  it("calls onQualityChange on click", () => {
    const onQualityChange = jest.fn();
    render(<ExportPanel {...defaultProps} onQualityChange={onQualityChange} />);
    fireEvent.click(screen.getByText("720p"));
    expect(onQualityChange).toHaveBeenCalledWith("720p");
  });

  it("export button disabled when no scenes selected", () => {
    render(<ExportPanel {...defaultProps} selectedScenes={[]} />);
    const exportBtn = screen.getByRole("button", { name: /export clip/i });
    expect(exportBtn).toBeDisabled();
  });

  it("export button disabled when isExporting", () => {
    render(<ExportPanel {...defaultProps} isExporting />);
    const exportBtn = screen.getByRole("button", { name: /exporting/i });
    expect(exportBtn).toBeDisabled();
  });

  it("calls onExport with format and quality", () => {
    render(<ExportPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /export clip/i }));
    expect(defaultProps.onExport).toHaveBeenCalledWith({ format: "mp4", quality: "1080p" });
  });

  it("shows export error", () => {
    render(<ExportPanel {...defaultProps} exportError="Upload failed" />);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("shows scenes count in summary", () => {
    const { container } = render(<ExportPanel {...defaultProps} />);
    const summaryLabels = container.querySelectorAll(".text-\\[10px\\].text-muted-foreground");
    const scenesLabel = Array.from(summaryLabels).find((el) => el.textContent === "Scenes");
    const scenesValue = scenesLabel?.parentElement?.querySelector(".font-mono.font-medium");
    expect(scenesValue?.textContent).toBe("2");
  });

  it("shows caption count", () => {
    const { container } = render(<ExportPanel {...defaultProps} captions={[{ id: "1" } as any]} />);
    const summaryLabels = container.querySelectorAll(".text-\\[10px\\].text-muted-foreground");
    const captionsLabel = Array.from(summaryLabels).find((el) => el.textContent === "Captions");
    const captionsValue = captionsLabel?.parentElement?.querySelector(".font-mono.font-medium");
    expect(captionsValue?.textContent).toBe("1");
  });

  it("shows Original audio when no music track", () => {
    render(<ExportPanel {...defaultProps} />);
    expect(screen.getByText("Original audio")).toBeInTheDocument();
  });

  it("shows clip status list when clips provided", () => {
    const clips = [
      { id: "c1", sceneIndex: 0, startTime: 0, endTime: 10, status: "completed", fileUrl: "/file.mp4" },
      { id: "c2", sceneIndex: 1, startTime: 15, endTime: 25, status: "processing" },
    ] as any;
    render(<ExportPanel {...defaultProps} clips={clips} />);
    expect(screen.getByText(/Scene 1/)).toBeInTheDocument();
    expect(screen.getByText(/Scene 2/)).toBeInTheDocument();
  });

  it("shows download button for completed clips", () => {
    const clips = [
      { id: "c1", sceneIndex: 0, startTime: 0, endTime: 10, status: "completed", fileUrl: "/file.mp4" },
    ] as any;
    render(<ExportPanel {...defaultProps} clips={clips} />);
    const downloadLink = screen.getByRole("link");
    expect(downloadLink).toHaveAttribute("href", "/api/clips/c1/download");
  });
});
