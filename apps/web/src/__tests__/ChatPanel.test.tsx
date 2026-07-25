import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatPanel } from "../presentation/components/studio/ChatPanel";

const mockMessages = [
  { id: "1", role: "user" as const, content: "Add captions", timestamp: new Date() },
  { id: "2", role: "system" as const, content: "Applied 1 action", timestamp: new Date() },
  { id: "3", role: "user" as const, content: "Make it faster", timestamp: new Date() },
];

const defaultProps = {
  messages: [],
  onSend: jest.fn(),
};

describe("ChatPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header with title and subtitle", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Edit with prompts")).toBeInTheDocument();
    expect(screen.getByText("Describe what you want to change")).toBeInTheDocument();
  });

  it("renders empty state with prompt suggestions", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Try prompts like:")).toBeInTheDocument();
    expect(screen.getByText(/Add bold white captions/)).toBeInTheDocument();
    expect(screen.getByText(/Make it 2x speed/)).toBeInTheDocument();
    expect(screen.getByText(/Mix in background music/)).toBeInTheDocument();
  });

  it("suggestion buttons call onSend with prompt text", () => {
    render(<ChatPanel {...defaultProps} />);
    const suggestions = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes('"') && !btn.textContent?.includes("Send")
    );
    fireEvent.click(suggestions[0]);
    expect(defaultProps.onSend).toHaveBeenCalledWith(
      expect.stringContaining("Add bold white captions")
    );
  });

  it("renders messages list", () => {
    render(<ChatPanel {...defaultProps} messages={mockMessages} />);
    expect(screen.getByText("Add captions")).toBeInTheDocument();
    expect(screen.getByText("Applied 1 action")).toBeInTheDocument();
    expect(screen.getByText("Make it faster")).toBeInTheDocument();
  });

  it("shows TypingIndicator with analyzing phase", () => {
    render(<ChatPanel {...defaultProps} loadingPhase="analyzing" />);
    expect(screen.getByText("Analyzing your prompt")).toBeInTheDocument();
  });

  it("shows TypingIndicator with generating phase", () => {
    render(<ChatPanel {...defaultProps} loadingPhase="generating" />);
    expect(screen.getByText("Generating preview")).toBeInTheDocument();
  });

  it("hides TypingIndicator when phase is null", () => {
    render(<ChatPanel {...defaultProps} loadingPhase={null} />);
    expect(screen.queryByText("Analyzing your prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("Generating preview")).not.toBeInTheDocument();
  });

  it("hides empty state when messages exist", () => {
    render(<ChatPanel {...defaultProps} messages={mockMessages} />);
    expect(screen.queryByText("Try prompts like:")).not.toBeInTheDocument();
  });

  it("ChatInput is disabled when loading", () => {
    render(<ChatPanel {...defaultProps} loadingPhase="analyzing" />);
    expect(screen.getByPlaceholderText("Describe your edit...")).toBeDisabled();
  });

  it("ChatInput is enabled when not loading", () => {
    render(<ChatPanel {...defaultProps} loadingPhase={null} />);
    expect(screen.getByPlaceholderText("Describe your edit...")).toBeEnabled();
  });
});
