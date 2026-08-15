"use client";

import { memo, useMemo, useEffect, useId, useRef } from "react";
import { Caption } from "@/domain/entities/caption";
import { CAPTION_FONTS } from "@/presentation/constants/caption";
import { FPS } from "@/lib/constants";

interface CaptionOverlayProps {
  caption: Caption;
  sceneElapsed: number;
  containerWidth: number;
  containerHeight: number;
  isDraggable?: boolean;
  onDrag?: (id: string, x: number, y: number) => void;
}

function getTextStyleStyles(caption: Caption): React.CSSProperties {
  const { textStyle, strokeWidth, shadowRadius, color } = caption;
  const strokeColor = color === "#000000" ? "#FFFFFF" : "#000000";

  switch (textStyle) {
    case "outlined":
      return {
        WebkitTextStroke: `${strokeWidth || 2}px ${strokeColor}`,
        paintOrder: "stroke fill",
      };
    case "shadow":
      return {
        textShadow: `2px 2px 4px rgba(0,0,0,0.8), 0 0 ${shadowRadius || 8}px rgba(0,0,0,0.5)`,
      };
    case "neon":
      return {
        textShadow: `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
      };
    default:
      return strokeWidth > 0
        ? { WebkitTextStroke: `${strokeWidth}px ${strokeColor}`, paintOrder: "stroke fill" }
        : shadowRadius > 0
        ? { textShadow: `0 0 ${shadowRadius}px rgba(0,0,0,0.5)` }
        : {};
  }
}

function getAnimationKeyframes(animation: Caption["animation"]): React.CSSProperties {
  switch (animation) {
    case "fade":
      return { animation: "captionFadeIn 0.3s ease-out forwards" };
    case "slide":
      return { animation: "captionSlideIn 0.3s ease-out forwards" };
    case "pop":
      return { animation: "captionPopIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards" };
    default:
      return {};
  }
}

export const CaptionOverlay = memo(function CaptionOverlay({
  caption,
  sceneElapsed,
  containerWidth,
  containerHeight,
  isDraggable = false,
  onDrag,
}: CaptionOverlayProps) {
  const styleId = useId();
  const captionStart = caption.startFrame / FPS;
  const captionEnd = caption.endFrame / FPS;
  const isDraggingRef = useRef(false);

  const isVisible = sceneElapsed >= captionStart && sceneElapsed <= captionEnd;

  useEffect(() => {
    const existing = document.getElementById(`caption-anim-global`);
    if (existing) return;
    const style = document.createElement("style");
    style.id = "caption-anim-global";
    style.textContent = `
      @keyframes captionFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes captionSlideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes captionPopIn {
        from { opacity: 0; transform: scale(0.5); }
        70% { opacity: 1; transform: scale(1.1); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const positionStyle = useMemo<React.CSSProperties>(() => {
    if (caption.x != null && caption.y != null) {
      return {
        position: "absolute",
        left: `${caption.x}%`,
        top: `${caption.y}%`,
        transform: "translate(-50%, -50%)",
      };
    }
    const padding = containerHeight * 0.08;
    switch (caption.position) {
      case "top":
        return { position: "absolute", top: padding, left: 0, right: 0 };
      case "bottom":
        return { position: "absolute", bottom: padding, left: 0, right: 0 };
      default:
        return { position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)" };
    }
  }, [caption.x, caption.y, caption.position, containerHeight]);

  const textStyleStyles = useMemo(() => getTextStyleStyles(caption), [caption]);
  const animStyle = useMemo(() => getAnimationKeyframes(caption.animation), [caption.animation]);

  const fontSize = Math.min(caption.size * 0.5, containerWidth * 0.07);
  const fontFamily = CAPTION_FONTS[caption.font].cssFamily;

  const words = caption.text.split(" ");

  if (!isVisible) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDraggable || !onDrag) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startCapX = caption.x ?? 50;
    const startCapY = caption.y ?? 50;
    const rect = target.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newX = Math.max(5, Math.min(95, startCapX + (dx / rect.width) * 100));
      const newY = Math.max(5, Math.min(95, startCapY + (dy / rect.height) * 100));
      onDrag(caption.id, newX, newY);
    };

    const onUp = () => {
      isDraggingRef.current = false;
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className={`text-center leading-tight break-words z-[7] ${
        isDraggable ? "pointer-events-auto cursor-grab active:cursor-grabbing" : "pointer-events-none"
      }`}
      style={{
        fontFamily,
        fontSize: `${fontSize}px`,
        color: caption.color,
        opacity: caption.opacity,
        textAlign: caption.textAlign,
        maxWidth: "100%",
        wordBreak: "break-word",
        backgroundColor: caption.backgroundEnabled ? caption.backgroundColor : "transparent",
        padding: caption.backgroundEnabled ? "4px 12px" : undefined,
        borderRadius: caption.backgroundEnabled ? "4px" : undefined,
        ...positionStyle,
        ...textStyleStyles,
        ...animStyle,
      }}
      onPointerDown={handlePointerDown}
    >
      {caption.animation === "pop" && words.length > 1
        ? words.map((word, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                animation: `captionPopIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${i * 0.08}s forwards`,
                opacity: 0,
                marginRight: i < words.length - 1 ? "0.3em" : 0,
              }}
            >
              {word}
            </span>
          ))
        : caption.text}
    </div>
  );
});
