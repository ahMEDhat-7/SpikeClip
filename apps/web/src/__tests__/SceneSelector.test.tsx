import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SceneSelector } from "../presentation/components/studio/SceneSelector";

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
  { start_time: 30, end_time: 40, duration: 10, peak_intensity: 0.7, avg_intensity: 0.6, score: 0.65, confidence: "high" as const, capped: false },
];

const defaultProps = {
  scenes: mockScenes,
  selectedSceneIndex: null,
  onSelectScene: jest.fn(),
};

describe("SceneSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no scenes and no videoDuration", () => {
    render(<SceneSelector scenes={[]} selectedSceneIndex={null} onSelectScene={jest.fn()} />);
    expect(screen.getByText(/No scenes were detected/)).toBeInTheDocument();
  });

  it("renders scene cards with scene numbers", () => {
    render(<SceneSelector {...defaultProps} />);
    expect(screen.getByText("Scene 1")).toBeInTheDocument();
    expect(screen.getByText("Scene 2")).toBeInTheDocument();
    expect(screen.getByText("Scene 3")).toBeInTheDocument();
  });

  it("shows duration badge", () => {
    const { container } = render(<SceneSelector {...defaultProps} />);
    expect(container.textContent).toContain("10.0s");
  });

  it("shows intensity percentage", () => {
    const { container } = render(<SceneSelector {...defaultProps} />);
    expect(container.textContent).toContain("80%");
    expect(container.textContent).toContain("90%");
    expect(container.textContent).toContain("70%");
  });

  it("highlights selected scene", () => {
    const { container } = render(<SceneSelector {...defaultProps} selectedSceneIndex={1} />);
    const cards = container.querySelectorAll("[tabindex='0']");
    expect(cards[1]).toHaveClass("ring-1");
  });

  it("calls onSelectScene on click", () => {
    render(<SceneSelector {...defaultProps} />);
    fireEvent.click(screen.getByText("Scene 2"));
    expect(defaultProps.onSelectScene).toHaveBeenCalledWith(1);
  });

  it("keyboard Enter triggers onSelectScene", () => {
    const { container } = render(<SceneSelector {...defaultProps} />);
    const card = container.querySelectorAll("[tabindex='0']")[0];
    fireEvent.keyDown(card, { key: "Enter" });
    expect(defaultProps.onSelectScene).toHaveBeenCalledWith(0);
  });

  it("keyboard Space triggers onSelectScene", () => {
    const { container } = render(<SceneSelector {...defaultProps} />);
    const card = container.querySelectorAll("[tabindex='0']")[0];
    fireEvent.keyDown(card, { key: " " });
    expect(defaultProps.onSelectScene).toHaveBeenCalledWith(0);
  });
});
