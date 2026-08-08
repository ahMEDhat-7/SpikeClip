export type CaptionFont = "inter" | "impact" | "bebas" | "playfair" | "mono";
export type CaptionPosition = "top" | "center" | "bottom" | "left" | "right";
export type CaptionTextStyle = "bold" | "outlined" | "shadow" | "neon";
export type CaptionTextAlign = "left" | "center" | "right";

export interface Caption {
  id: string;
  sceneIndex?: number;
  text: string;
  font: CaptionFont;
  size: number;
  color: string;
  position: CaptionPosition;
  textAlign: CaptionTextAlign;
  startFrame: number;
  endFrame: number;
  animation: "pop" | "slide" | "fade" | "none";
  textStyle: CaptionTextStyle;
  opacity: number;
  backgroundColor: string;
  backgroundEnabled: boolean;
  strokeWidth: number;
  shadowRadius: number;
  x?: number;
  y?: number;
}

export function createCaption(overrides?: Partial<Caption>): Caption {
  return {
    id: crypto.randomUUID(),
    text: "Your text here",
    font: "inter",
    size: 48,
    color: "#FFFFFF",
    position: "center",
    textAlign: "center",
    startFrame: 0,
    endFrame: 60,
    animation: "pop",
    textStyle: "bold",
    opacity: 1,
    backgroundColor: "#000000",
    backgroundEnabled: false,
    strokeWidth: 0,
    shadowRadius: 0,
    x: 50,
    y: 50,
    ...overrides,
  };
}
