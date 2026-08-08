"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HERO_ANIMATION_DURATION_MS } from "@/lib/constants";

export function AnimatedHeatmapHero({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const duration = HERO_ANIMATION_DURATION_MS;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsPaused(true);
        } else {
          setIsPaused(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    startTimeRef.current = performance.now() - progress * duration;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const p = (elapsed % duration) / duration;
      setProgress(p);
      // Directly update progress bar DOM (bypasses React render cycle)
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      if (thumbRef.current) thumbRef.current.style.transform = `translateX(calc(${p * 100}% - 6px))`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPaused]);

  const playBarX = 8 + progress * 48;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl",
        "border border-hairline/50 bg-card shadow-2xl shadow-primary/5",
        className
      )}
      role="img"
      aria-label="Animated heatmap visualization showing viewer engagement"
    >
      <div className="relative aspect-video overflow-hidden bg-[#0f0f1a]">
        {/* Subtle background glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse 60% 50% at ${30 + progress * 40}% 60%, #E6394615 0%, transparent 70%)`,
          }}
        />

        {/* Main heatmap SVG */}
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: "drop-shadow(0 0 8px #E6394630)" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="heroHeatGrad"
              x1="0%"
              y1="100%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#E63946" />
            </linearGradient>
            <linearGradient
              id="heroFillGrad"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#E63946" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Baseline */}
          <line
            x1="4"
            y1="48"
            x2="60"
            y2="48"
            stroke="white"
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeOpacity="0.3"
          />

          {/* Fill path */}
          <path
            d="M4 48 Q32 48 60 48 L60 48 L4 48 Z"
            fill="url(#heroFillGrad)"
          >
            <animate
              attributeName="opacity"
              values="0;0.15;0.4;0.7;1;1;1;1;0.9;0.7;0.4;0.15;0"
              dur="12s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
            <animate
              attributeName="d"
              values="
                M4 48 Q32 48 60 48 L60 48 L4 48 Z;
                M4 48 Q10 48 16 48 Q24 48 32 48 Q40 48 48 48 Q56 48 60 48 L60 48 L4 48 Z;
                M4 48 Q8 48 12 46 Q18 44 24 48 Q30 48 36 46 Q42 44 48 48 Q54 48 60 48 L60 48 L4 48 Z;
                M4 48 Q8 46 12 40 Q18 34 24 46 Q30 47 36 45 Q42 43 48 46 Q54 48 60 48 L60 48 L4 48 Z;
                M4 48 Q8 42 12 32 Q18 38 24 44 Q30 46 36 44 Q42 41 48 44 Q54 46 60 48 L60 48 L4 48 Z;
                M4 48 Q8 32 12 16 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48 Z;
                M4 48 Q8 32 12 16 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48 Z;
                M4 48 Q8 32 12 16 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48 Z;
                M4 48 Q8 40 12 28 Q18 38 24 44 Q30 46 36 44 Q42 41 48 44 Q54 46 60 48 L60 48 L4 48 Z;
                M4 48 Q8 46 12 40 Q18 34 24 46 Q30 47 36 45 Q42 43 48 46 Q54 48 60 48 L60 48 L4 48 Z;
                M4 48 Q8 48 12 46 Q18 44 24 48 Q30 48 36 46 Q42 44 48 48 Q54 48 60 48 L60 48 L4 48 Z;
                M4 48 Q10 48 16 48 Q24 48 32 48 Q40 48 48 48 Q56 48 60 48 L60 48 L4 48 Z;
                M4 48 Q32 48 60 48 L60 48 L4 48 Z"
              dur="12s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
          </path>

          {/* Stroke path */}
          <path
            d="M4 48 Q32 48 60 48 L60 48 L4 48"
            fill="none"
            stroke="url(#heroHeatGrad)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <animate
              attributeName="opacity"
              values="0;0.15;0.4;0.7;1;1;1;1;0.9;0.7;0.4;0.15;0"
              dur="12s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
            <animate
              attributeName="d"
              values="
                M4 48 Q32 48 60 48 L60 48 L4 48;
                M4 48 Q10 48 16 48 Q24 48 32 48 Q40 48 48 48 Q56 48 60 48 L60 48 L4 48;
                M4 48 Q8 48 12 46 Q18 44 24 48 Q30 48 36 46 Q42 44 48 48 Q54 48 60 48 L60 48 L4 48;
                M4 48 Q8 46 12 40 Q18 34 24 46 Q30 47 36 45 Q42 43 48 46 Q54 48 60 48 L60 48 L4 48;
                M4 48 Q8 40 12 28 Q18 38 24 44 Q30 46 36 44 Q42 41 48 44 Q54 46 60 48 L60 48 L4 48;
                M4 48 Q8 28 12 10 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48;
                M4 48 Q8 28 12 10 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48;
                M4 48 Q8 28 12 10 Q18 38 24 44 Q30 46 36 43 Q42 40 48 44 Q54 46 60 48 L60 48 L4 48;
                M4 48 Q8 40 12 28 Q18 38 24 44 Q30 46 36 44 Q42 41 48 44 Q54 46 60 48 L60 48 L4 48;
                M4 48 Q8 46 12 40 Q18 34 24 46 Q30 47 36 45 Q42 43 48 46 Q54 48 60 48 L60 48 L4 48;
                M4 48 Q8 48 12 46 Q18 44 24 48 Q30 48 36 46 Q42 44 48 48 Q54 48 60 48 L60 48 L4 48;
                M4 48 Q10 48 16 48 Q24 48 32 48 Q40 48 48 48 Q56 48 60 48 L60 48 L4 48;
                M4 48 Q32 48 60 48 L60 48 L4 48"
              dur="12s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
          </path>

          {/* Red play bar */}
          <line
            x1={playBarX}
            y1="8"
            x2={playBarX}
            y2="50"
            stroke="#E63946"
            strokeWidth="0.3"
            strokeOpacity="0.7"
          />
          <circle
            cx={playBarX}
            cy="48"
            r="1"
            fill="#E63946"
          >
            <animate
              attributeName="r"
              values="0.8;1.2;0.8"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;1;0.8"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Play bar at bottom of player */}
        <div className="absolute bottom-8 left-4 right-4 h-1 rounded-full bg-white/10">
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full rounded-full origin-left"
            style={{
              width: "100%",
              transform: `scaleX(${progress})`,
              background: "linear-gradient(90deg, #E63946 0%, #FF6B35 100%)",
              boxShadow: "0 0 10px #E6394680",
            }}
          />
          <div
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              left: 0,
              transform: `translateX(calc(${progress * 100}% - 6px))`,
              background: "#E63946",
              boxShadow: "0 0 8px #E63946, 0 0 16px #E6394660",
            }}
          />
        </div>
      </div>
    </div>
  );
}
