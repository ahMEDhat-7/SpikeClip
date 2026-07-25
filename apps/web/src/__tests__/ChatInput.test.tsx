import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatInput } from "../presentation/components/studio/ChatInput";

const defaultProps = {
  onSend: jest.fn(),
};

describe("ChatInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders input and send button", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Describe your edit...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("calls onSend with trimmed text on submit", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe your edit...");
    fireEvent.change(input, { target: { value: "  Hello  " } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onSend).toHaveBeenCalledWith("Hello");
  });

  it("clears input after send", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe your edit...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.submit(input.closest("form")!);
    expect(input.value).toBe("");
  });

  it("does not send empty or whitespace-only messages", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe your edit...");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("does not send when disabled", () => {
    render(<ChatInput {...defaultProps} disabled />);
    const input = screen.getByPlaceholderText("Describe your edit...");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onSend).not.toHaveBeenCalled();
  });

  it("disables send button when input is empty", () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("enables send button when input has text", () => {
    render(<ChatInput {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe your edit...");
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(screen.getByRole("button", { name: /send/i })).toBeEnabled();
  });

  it("disables both input and button when disabled prop is true", () => {
    render(<ChatInput {...defaultProps} disabled />);
    expect(screen.getByPlaceholderText("Describe your edit...")).toBeDisabled();
    const submitBtn = screen.getByRole("button");
    expect(submitBtn).toBeDisabled();
  });
});
