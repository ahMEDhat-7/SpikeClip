export type CaptionFont = "inter" | "impact" | "bebas" | "playfair" | "mono" | "noto-arabic" | "noto-naskh" | "noto-kufi";
export type CaptionPosition = "top" | "center" | "bottom" | "left" | "right";
export type CaptionTextStyle = "bold" | "outlined" | "shadow" | "neon";
export type CaptionTextAlign = "left" | "center" | "right";
export type TextDirection = "ltr" | "rtl" | "auto";

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
  direction?: TextDirection;
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
    direction: "auto",
    ...overrides,
  };
}

export function detectTextDirection(text: string): TextDirection {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text) ? "rtl" : "ltr";
}

export function autoCaptionFont(text: string, currentFont: CaptionFont): CaptionFont {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicRegex.test(text) && !["noto-arabic", "noto-naskh", "noto-kufi"].includes(currentFont)) {
    return "noto-arabic";
  }
  return currentFont;
}
