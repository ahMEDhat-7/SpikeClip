import { CaptionFont, CaptionTextStyle, CaptionTextAlign } from "@/domain/entities/caption";

export const CAPTION_FONTS: Record<CaptionFont, { label: string; className: string; cssFamily: string }> = {
  inter: { label: "Inter", className: "font-sans", cssFamily: "'Inter', sans-serif" },
  impact: { label: "Impact", className: "font-impact", cssFamily: "'Impact', sans-serif" },
  bebas: { label: "Bebas Neue", className: "font-bebas", cssFamily: "'Bebas Neue', sans-serif" },
  playfair: { label: "Playfair Display", className: "font-playfair", cssFamily: "'Playfair Display', serif" },
  mono: { label: "JetBrains Mono", className: "font-mono", cssFamily: "'JetBrains Mono', monospace" },
  "noto-arabic": { label: "Noto Arabic", className: "font-noto-arabic", cssFamily: "'Noto Sans Arabic UI', sans-serif" },
  "noto-naskh": { label: "Noto Naskh", className: "font-noto-naskh", cssFamily: "'Noto Naskh Arabic', serif" },
  "noto-kufi": { label: "Noto Kufi", className: "font-noto-kufi", cssFamily: "'Noto Kufi Arabic', sans-serif" },
};

export const CAPTION_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#EF4444" },
  { label: "Orange", value: "#F97316" },
  { label: "Gold", value: "#EAB308" },
  { label: "Green", value: "#22C55E" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Pink", value: "#EC4899" },
  { label: "Purple", value: "#A855F7" },
  { label: "Blue", value: "#3B82F6" },
];

export const TEXT_STYLES: { id: CaptionTextStyle; label: string }[] = [
  { id: "bold", label: "Bold" },
  { id: "outlined", label: "Outlined" },
  { id: "shadow", label: "Shadow" },
  { id: "neon", label: "Neon" },
];

export const TEXT_ALIGNMENTS: { id: CaptionTextAlign; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];
