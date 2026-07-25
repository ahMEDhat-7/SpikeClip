import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StudioTimeline } from "../presentation/components/studio/StudioTimeline";

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
];

const defaultProps = {
  scenes: mockScenes,
  selectedScenes: [],
  totalDuration: 30,
  onToggleScene: jest.fn(),
};

describe("StudioTimeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when totalDuration <= 0", () => {
    const { container } = render(<StudioTimeline {...defaultProps} totalDuration={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when scenes empty", () => {
    const { container } = render(<StudioTimeline {...defaultProps} scenes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders scene segments", () => {
    render(<StudioTimeline {...defaultProps} />);
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("S2")).toBeInTheDocument();
  });

  it("shows time labels at start and end", () => {
    render(<StudioTimeline {...defaultProps} />);
    const timeDiv = document.querySelector(".flex.justify-between.text-\\[9px\\].font-mono.text-muted-foreground");
    expect(timeDiv).toBeTruthy();
    const spans = timeDiv!.querySelectorAll("span");
    expect(spans[0]?.textContent).toBe("0:00");
    expect(spans[1]?.textContent).toBe("0:30");
  });

  it("highlights selected scenes", () => {
    const { container } = render(<StudioTimeline {...defaultProps} selectedScenes={[0]} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[0]).toHaveClass("bg-primary/70");
  });

  it("does not highlight unselected scenes", () => {
    const { container } = render(<StudioTimeline {...defaultProps} selectedScenes={[0]} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[1]).not.toHaveClass("bg-primary/70");
  });

  it("calls onToggleScene on click", () => {
    render(<StudioTimeline {...defaultProps} />);
    fireEvent.click(screen.getByText("S1"));
    expect(defaultProps.onToggleScene).toHaveBeenCalledWith(0);
  });

  it("hides label text for narrow segments", () => {
    const narrowScenes = [
      { start_time: 0, end_time: 1, duration: 1, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
      { start_time: 1, end_time: 99, duration: 98, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
    ];
    const { container } = render(<StudioTimeline {...defaultProps} scenes={narrowScenes} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[0].textContent).toBe("");
    expect(buttons[1].textContent).toContain("S2");
  });
});
