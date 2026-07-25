import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PlatformSelector } from "../presentation/components/studio/PlatformSelector";
import { PLATFORMS } from "@/domain/entities/platform";

const defaultProps = {
  selected: null,
  onSelect: jest.fn(),
};

describe("PlatformSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all 3 platforms", () => {
    render(<PlatformSelector {...defaultProps} />);
    expect(screen.getByText("YouTube Shorts")).toBeInTheDocument();
    expect(screen.getByText("Instagram Reels")).toBeInTheDocument();
    expect(screen.getByText("TikTok")).toBeInTheDocument();
  });

  it("shows platform descriptions", () => {
    render(<PlatformSelector {...defaultProps} />);
    expect(screen.getByText(PLATFORMS[0].description)).toBeInTheDocument();
    expect(screen.getByText(PLATFORMS[1].description)).toBeInTheDocument();
    expect(screen.getByText(PLATFORMS[2].description)).toBeInTheDocument();
  });

  it("shows aspect ratio badges for all platforms", () => {
    const { container } = render(<PlatformSelector {...defaultProps} />);
    const badges = container.querySelectorAll(".font-mono");
    const ratioBadges = Array.from(badges).filter((b) => b.textContent === "9:16");
    expect(ratioBadges).toHaveLength(3);
  });

  it("highlights selected platform", () => {
    const selected = PLATFORMS[0];
    const { container } = render(
      <PlatformSelector {...defaultProps} selected={selected} />
    );
    const cards = container.querySelectorAll("[tabindex='0']");
    expect(cards[0]).toHaveClass("ring-2");
  });

  it("shows check icon for selected platform", () => {
    const selected = PLATFORMS[0];
    const { container } = render(
      <PlatformSelector {...defaultProps} selected={selected} />
    );
    expect(container.querySelector(".lucide-check")).toBeInTheDocument();
  });

  it("shows crop message for selected platform", () => {
    const selected = PLATFORMS[0];
    render(<PlatformSelector {...defaultProps} selected={selected} />);
    expect(screen.getByText(/This will crop your video to/)).toBeInTheDocument();
  });

  it("calls onSelect on click", () => {
    render(<PlatformSelector {...defaultProps} />);
    fireEvent.click(screen.getByText("YouTube Shorts"));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(PLATFORMS[0]);
  });

  it("keyboard Enter triggers onSelect", () => {
    const { container } = render(<PlatformSelector {...defaultProps} />);
    const card = container.querySelectorAll("[tabindex='0']")[0];
    fireEvent.keyDown(card, { key: "Enter" });
    expect(defaultProps.onSelect).toHaveBeenCalledWith(PLATFORMS[0]);
  });

  it("Space key triggers onSelect", () => {
    const { container } = render(<PlatformSelector {...defaultProps} />);
    const card = container.querySelectorAll("[tabindex='0']")[0];
    fireEvent.keyDown(card, { key: " " });
    expect(defaultProps.onSelect).toHaveBeenCalledWith(PLATFORMS[0]);
  });
});
