"use client";

import { useEffect, useRef } from "react";

export function CursorCircle() {
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      el.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      el.style.opacity = "0";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={circleRef}
      className="pointer-events-none"
      style={{
        position: "fixed",
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: `radial-gradient(circle, var(--color-primary) 0%, transparent 70%)`,
        opacity: 0,
        transform: "translate(-50%, -50%)",
        transition: "opacity 0.3s ease-out",
        filter: "blur(20px)",
        zIndex: 1,
      }}
    />
  );
}
