import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatMessage, TypingIndicator } from "../presentation/components/studio/ChatMessage";

const userMessage = {
  id: "1",
  role: "user" as const,
  content: "Add bold captions",
  timestamp: new Date(),
};

const systemMessage = {
  id: "2",
  role: "system" as const,
  content: "Applied 1 action(s): add_captions",
  timestamp: new Date(),
};

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage message={userMessage} />);
    expect(screen.getByText("Add bold captions")).toBeInTheDocument();
  });

  it("renders system message content", () => {
    render(<ChatMessage message={systemMessage} />);
    expect(screen.getByText("Applied 1 action(s): add_captions")).toBeInTheDocument();
  });

  it("renders user message right-aligned", () => {
    const { container } = render(<ChatMessage message={userMessage} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("justify-end");
  });

  it("renders system message left-aligned", () => {
    const { container } = render(<ChatMessage message={systemMessage} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("justify-start");
  });

  it("user message has primary background", () => {
    const { container } = render(<ChatMessage message={userMessage} />);
    const bubble = container.querySelector(".bg-primary");
    expect(bubble).toBeInTheDocument();
  });

  it("system message has muted background", () => {
    const { container } = render(<ChatMessage message={systemMessage} />);
    const bubble = container.querySelector(".bg-muted");
    expect(bubble).toBeInTheDocument();
  });
});

describe("TypingIndicator", () => {
  it("renders Thinking text", () => {
    render(<TypingIndicator />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("renders a spinner icon", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("is left-aligned", () => {
    const { container } = render(<TypingIndicator />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("justify-start");
  });
});
