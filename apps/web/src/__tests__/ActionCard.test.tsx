import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ActionCard } from "../presentation/components/studio/ActionCard";
import type { StudioAction } from "@spikeclips/shared";

const captionAction: StudioAction = {
  action: "add_captions",
  text: "Hello World",
  font: "inter",
  size: 48,
  color: "#FFFFFF",
  position: "center",
  start: 0,
  end: 5,
  animation: "none",
  style: "normal",
  opacity: 1,
  backgroundEnabled: false,
  strokeWidth: 2,
  shadowRadius: 2,
};

const audioAction: StudioAction = {
  action: "mix_audio",
  volume: 0.3,
  originalVolume: 1,
  fadeIn: 0,
  fadeOut: 0,
  tone: "normal",
};

const effectAction: StudioAction = {
  action: "apply_effect",
  type: "vignette",
  intensity: 0.7,
};

const speedAction: StudioAction = {
  action: "set_speed",
  rate: 2.0,
  preservePitch: true,
};

const overlayAction: StudioAction = {
  action: "add_overlay",
  assetKey: "logo.png",
  x: 50,
  y: 50,
  scale: 1,
  opacity: 1,
};

const transitionAction: StudioAction = {
  action: "set_transition",
  type: "fade",
  duration: 0.5,
  position: "start",
};

const backgroundAction: StudioAction = {
  action: "add_background",
  color: "#FF0000",
  startTime: 0,
  endTime: 5,
};

const trimAction: StudioAction = {
  action: "trim",
  startTime: 2,
  endTime: 8,
};

describe("ActionCard", () => {
  const defaultProps = {
    index: 2,
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders caption action with correct label and summary", () => {
    render(<ActionCard {...defaultProps} action={captionAction} />);
    expect(screen.getByText("Caption")).toBeInTheDocument();
    expect(screen.getByText(/"Hello World"/)).toBeInTheDocument();
    expect(screen.getByText(/0s-5s/)).toBeInTheDocument();
  });

  it("renders audio mix action summary", () => {
    render(<ActionCard {...defaultProps} action={audioAction} />);
    expect(screen.getByText("Audio Mix")).toBeInTheDocument();
    expect(screen.getByText("Volume 30%")).toBeInTheDocument();
  });

  it("renders effect action summary", () => {
    render(<ActionCard {...defaultProps} action={effectAction} />);
    expect(screen.getByText("Effect")).toBeInTheDocument();
    expect(screen.getByText("vignette (70%)")).toBeInTheDocument();
  });

  it("renders speed action summary", () => {
    render(<ActionCard {...defaultProps} action={speedAction} />);
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("2x speed")).toBeInTheDocument();
  });

  it("renders overlay action summary", () => {
    render(<ActionCard {...defaultProps} action={overlayAction} />);
    expect(screen.getByText("Overlay")).toBeInTheDocument();
    expect(screen.getByText("logo.png")).toBeInTheDocument();
  });

  it("renders transition action summary", () => {
    render(<ActionCard {...defaultProps} action={transitionAction} />);
    expect(screen.getByText("Transition")).toBeInTheDocument();
    expect(screen.getByText("fade (0.5s)")).toBeInTheDocument();
  });

  it("renders background action summary", () => {
    render(<ActionCard {...defaultProps} action={backgroundAction} />);
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("#FF0000")).toBeInTheDocument();
  });

  it("renders trim action summary", () => {
    render(<ActionCard {...defaultProps} action={trimAction} />);
    expect(screen.getByText("Trim")).toBeInTheDocument();
    expect(screen.getByText("2s-8s")).toBeInTheDocument();
  });

  it("calls onRemove with correct index", () => {
    render(<ActionCard {...defaultProps} action={captionAction} />);
    fireEvent.click(screen.getByLabelText("Remove action"));
    expect(defaultProps.onRemove).toHaveBeenCalledWith(2);
  });

  it("renders correct icon for each action type", () => {
    const { container } = render(<ActionCard {...defaultProps} action={captionAction} />);
    expect(container.textContent).toContain("Aa");
  });
});
