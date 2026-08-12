import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ActionList } from "../presentation/components/studio/ActionList";
import type { StudioAction } from "@spikeclips/shared";

const mockActions: StudioAction[] = [
  {
    action: "add_captions",
    text: "Hello",
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
  },
  {
    action: "set_speed",
    rate: 2.0,
    preservePitch: true,
  },
];

describe("ActionList", () => {
  const defaultProps = {
    onRemove: jest.fn(),
  };

  it("returns null for empty actions", () => {
    const { container } = render(<ActionList {...defaultProps} actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders action count header", () => {
    render(<ActionList {...defaultProps} actions={mockActions} />);
    expect(screen.getByText("Applied Actions (2)")).toBeInTheDocument();
  });

  it("renders ActionCard for each action", () => {
    render(<ActionList {...defaultProps} actions={mockActions} />);
    expect(screen.getByText("Caption")).toBeInTheDocument();
    expect(screen.getByText("Speed")).toBeInTheDocument();
  });

  it("renders correct count with single action", () => {
    render(<ActionList {...defaultProps} actions={[mockActions[0]]} />);
    expect(screen.getByText("Applied Actions (1)")).toBeInTheDocument();
  });

  it("renders disabled undo/redo when there is no history", () => {
    render(<ActionList {...defaultProps} actions={mockActions} canUndo={false} canRedo={false} />);
    expect(screen.getByLabelText("Undo")).toBeDisabled();
    expect(screen.getByLabelText("Redo")).toBeDisabled();
  });

  it("invokes onUndo and onRedo handlers", () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(
      <ActionList
        {...defaultProps}
        actions={mockActions}
        canUndo
        canRedo
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );
    fireEvent.click(screen.getByLabelText("Undo"));
    expect(onUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText("Redo"));
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
