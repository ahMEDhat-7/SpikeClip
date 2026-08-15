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
  onEdit: jest.fn(),
};

describe("SceneSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when no scenes and no videoDuration", () => {
    render(<SceneSelector scenes={[]} onEdit={jest.fn()} />);
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

  it("calls onEdit with correct times when Edit button is clicked", () => {
    render(<SceneSelector {...defaultProps} />);
    const editButtons = screen.getAllByText("Edit");
    fireEvent.click(editButtons[1]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith(15, 25);
  });

  it("shows Edit button for each scene", () => {
    render(<SceneSelector {...defaultProps} />);
    const editButtons = screen.getAllByText("Edit");
    expect(editButtons.length).toBe(3);
  });
});
