import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PreviewPanel } from "../presentation/components/studio/PreviewPanel";

jest.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});

const defaultProps = {
  previewUrl: null,
};

describe("PreviewPanel", () => {
  it("shows empty state when no url/loading/error", () => {
    render(<PreviewPanel {...defaultProps} />);
    expect(screen.getByText("No preview yet")).toBeInTheDocument();
    expect(screen.getByText("Type a prompt to see a preview")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    render(<PreviewPanel {...defaultProps} loading />);
    expect(screen.getByText("Rendering preview...")).toBeInTheDocument();
  });

  it("hides empty state when loading", () => {
    render(<PreviewPanel {...defaultProps} loading />);
    expect(screen.queryByText("No preview yet")).not.toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<PreviewPanel {...defaultProps} error="Failed to render" />);
    expect(screen.getByText("Failed to render")).toBeInTheDocument();
  });

  it("shows retry button when onRetry provided", () => {
    const onRetry = jest.fn();
    render(<PreviewPanel {...defaultProps} error="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("hides retry button when onRetry not provided", () => {
    render(<PreviewPanel {...defaultProps} error="Failed" />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("renders video when previewUrl set", () => {
    render(<PreviewPanel {...defaultProps} previewUrl="http://example.com/preview.mp4" />);
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.getAttribute("src")).toBe("http://example.com/preview.mp4");
  });

  it("shows time range in header", () => {
    render(<PreviewPanel {...defaultProps} sceneStart={5} sceneEnd={20} />);
    expect(screen.getByText("5s — 20s")).toBeInTheDocument();
  });

  it("shows header title", () => {
    const { container } = render(<PreviewPanel {...defaultProps} />);
    const header = container.querySelector(".border-b .font-semibold");
    expect(header?.textContent).toBe("Preview");
  });
});
