import { render, screen } from "@testing-library/react";
import { CompositePreview } from "@/presentation/components/studio/CompositePreview";
import { Job, ScoredBlock } from "@/domain/entities/job";

jest.mock("react-youtube", () => {
  return function MockYouTube() {
    return <div data-testid="youtube-player" />;
  };
});

jest.mock("@/presentation/components/studio/CaptionOverlay", () => ({
  CaptionOverlay: () => <div data-testid="caption-overlay" />,
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const mockJob: Job = {
  id: "job-1",
  userId: "user-1",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  status: "completed",
  createdAt: "2025-01-01",
};

const mockScenes: ScoredBlock[] = [
  { start_time: 0, end_time: 5, duration: 5, peak_intensity: 0.85, avg_intensity: 0.78, score: 0.82, confidence: "high", capped: false },
  { start_time: 10, end_time: 15, duration: 5, peak_intensity: 0.72, avg_intensity: 0.65, score: 0.70, confidence: "high", capped: false },
];

describe("CompositePreview", () => {
  const defaultProps = {
    job: mockJob,
    platform: { id: "tiktok", name: "TikTok", icon: "Music2", aspectRatio: "9:16", maxDuration: 180, description: "Short-form video" } as any,
    captions: [],
    selectedTemplate: null,
    scenes: mockScenes,
    selectedScenes: [0, 1],
    musicTrack: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the YouTube player", () => {
    render(<CompositePreview {...defaultProps} />);
    expect(screen.getByTestId("youtube-player")).toBeTruthy();
  });

  it("renders scene info bar with current scene", () => {
    const { container } = render(<CompositePreview {...defaultProps} />);
    expect(container.textContent).toContain("S1");
    expect(container.textContent).toContain("0:00");
    expect(container.textContent).toContain("0:05");
  });

  it("renders scene duration display", () => {
    const { container } = render(<CompositePreview {...defaultProps} />);
    expect(container.textContent).toContain("0.0s / 5.0s");
  });

  it("renders play button", () => {
    const { container } = render(<CompositePreview {...defaultProps} />);
    const playBtn = container.querySelector("button[aria-label='Play']");
    expect(playBtn).toBeTruthy();
  });

  it("renders preview header", () => {
    const { container } = render(<CompositePreview {...defaultProps} />);
    const header = container.querySelector(".border-b .text-xs.font-medium.text-muted-foreground");
    expect(header?.textContent).toBe("Preview");
  });

  it("renders platform name", () => {
    render(<CompositePreview {...defaultProps} />);
    expect(screen.getByText("TikTok")).toBeTruthy();
  });

  it("renders with no platform", () => {
    render(<CompositePreview {...defaultProps} platform={null} />);
    expect(screen.getByTestId("youtube-player")).toBeTruthy();
  });

  it("renders 9:16 aspect ratio for platform", () => {
    const { container } = render(<CompositePreview {...defaultProps} />);
    expect(container.querySelector(".aspect-\\[9\\/16\\]")).toBeTruthy();
  });

  it("renders 16:9 aspect ratio without platform", () => {
    const { container } = render(<CompositePreview {...defaultProps} platform={null} />);
    expect(container.querySelector(".aspect-video")).toBeTruthy();
  });

  it("does not render scene info when no scenes selected", () => {
    const { container } = render(<CompositePreview {...defaultProps} selectedScenes={[]} />);
    expect(container.textContent).not.toContain("S1");
  });

  it("returns null when video URL is invalid", () => {
    const { container } = render(
      <CompositePreview {...defaultProps} job={{ ...mockJob, url: "invalid" }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
