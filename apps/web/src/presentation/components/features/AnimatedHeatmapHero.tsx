"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HERO_ANIMATION_DURATION_MS } from "@/lib/constants";
import { Activity, Clock } from "lucide-react";

const TOTAL_DURATION_SEC = 225;
const SCENE_MARKERS = [0.12, 0.28, 0.45, 0.62, 0.78, 0.91];
const DATA_POINTS = 200;

// Seeded PRNG (mulberry32) — deterministic output across renders
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gaussian noise from uniform random
function gaussianNoise(rng: () => number, mean: number, stddev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

interface PeakAnchor {
  center: number;   // normalized position [0, 1]
  height: number;   // peak intensity [0.7, 1.0]
  width: number;    // half-width in data points
  asymmetry: number; // >0 = rise faster than fall, <0 = fall faster
}

function generateHeatmap(seed: number): number[] {
  const rng = mulberry32(seed);
  const data = new Array(DATA_POINTS).fill(0);

  // Define 5 peak anchors with realistic variation
  const peaks: PeakAnchor[] = [
    { center: 0.14, height: 0.72 + rng() * 0.18, width: 10 + Math.floor(rng() * 6), asymmetry: 0.2 + rng() * 0.4 },
    { center: 0.30, height: 0.85 + rng() * 0.15, width: 14 + Math.floor(rng() * 8), asymmetry: -0.1 + rng() * 0.5 },
    { center: 0.48, height: 0.90 + rng() * 0.10, width: 18 + Math.floor(rng() * 10), asymmetry: -0.3 + rng() * 0.6 },
    { center: 0.67, height: 0.78 + rng() * 0.22, width: 12 + Math.floor(rng() * 7), asymmetry: 0.1 + rng() * 0.3 },
    { center: 0.86, height: 0.88 + rng() * 0.12, width: 10 + Math.floor(rng() * 8), asymmetry: -0.2 + rng() * 0.4 },
  ];

  // Build base envelope from peaks
  for (const peak of peaks) {
    const peakIdx = Math.round(peak.center * (DATA_POINTS - 1));
    const riseWidth = peak.width * (1 - peak.asymmetry * 0.3);
    const fallWidth = peak.width * (1 + peak.asymmetry * 0.3);

    for (let i = 0; i < DATA_POINTS; i++) {
      const dist = i - peakIdx;
      let envelope: number;

      if (dist < 0) {
        // Rise side
        const t = Math.abs(dist) / Math.max(riseWidth, 1);
        envelope = peak.height * Math.exp(-t * t * 2.5);
      } else {
        // Fall side
        const t = dist / Math.max(fallWidth, 1);
        envelope = peak.height * Math.exp(-t * t * 2.0);
      }

      // Add micro-bumps within the peak zone (secondary engagement)
      if (Math.abs(dist) < peak.width * 0.6) {
        const bump = Math.sin(dist * 1.8 + peak.center * 50) * 0.06 * peak.height;
        envelope += bump;
      }

      data[i] = Math.max(data[i], envelope);
    }
  }

  // Add organic noise across entire timeline
  for (let i = 0; i < DATA_POINTS; i++) {
    const noise = gaussianNoise(rng, 0, 0.025);
    data[i] = Math.max(0, Math.min(1, data[i] + noise));
  }

  // Smooth with a 3-point moving average to reduce jaggedness
  const smoothed = [...data];
  for (let i = 1; i < DATA_POINTS - 1; i++) {
    smoothed[i] = data[i - 1] * 0.2 + data[i] * 0.6 + data[i + 1] * 0.2;
  }

  // Flat intro (first 6%) and outro (last 8%)
  const introEnd = Math.floor(DATA_POINTS * 0.06);
  const outroStart = Math.floor(DATA_POINTS * 0.92);
  for (let i = 0; i < introEnd; i++) {
    smoothed[i] *= i / introEnd * 0.3;
  }
  for (let i = outroStart; i < DATA_POINTS; i++) {
    const fade = 1 - (i - outroStart) / (DATA_POINTS - outroStart);
    smoothed[i] *= fade * 0.3;
  }

  return smoothed;
}

// Generated once at module load — deterministic
const HEATMAP_DATA = generateHeatmap(42);

function formatTime(progress: number): string {
  const totalSec = Math.floor(progress * TOTAL_DURATION_SEC);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function buildHeatmapPath(data: number[], progress: number): string {
  const visibleCount = Math.ceil(progress * (data.length - 1));
  const baseY = 48;
  const maxHeight = 36;
  const segW = 56 / (data.length - 1);

  if (visibleCount === 0) {
    return `M4 ${baseY} L60 ${baseY} L60 ${baseY + 1} L4 ${baseY + 1} Z`;
  }

  let d = `M4 ${baseY}`;
  for (let i = 0; i <= visibleCount; i++) {
    const x = 4 + i * segW;
    const h = data[i] * maxHeight;
    d += ` L${x.toFixed(2)} ${(baseY - h).toFixed(2)}`;
  }
  const lastX = 4 + visibleCount * segW;
  d += ` L${lastX.toFixed(2)} ${baseY} Z`;
  return d;
}

function buildStrokePath(data: number[], progress: number): string {
  const visibleCount = Math.ceil(progress * (data.length - 1));
  const baseY = 48;
  const maxHeight = 36;
  const segW = 56 / (data.length - 1);

  if (visibleCount === 0) {
    return `M4 ${baseY} L60 ${baseY}`;
  }

  let d = `M4 ${baseY}`;
  for (let i = 0; i <= visibleCount; i++) {
    const x = 4 + i * segW;
    const h = data[i] * maxHeight;
    d += ` L${x.toFixed(2)} ${(baseY - h).toFixed(2)}`;
  }
  return d;
}

export function AnimatedHeatmapHero({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillPathRef = useRef<SVGPathElement>(null);
  const strokePathRef = useRef<SVGPathElement>(null);
  const playheadLineRef = useRef<SVGLineElement>(null);
  const playheadCircleRef = useRef<SVGCircleElement>(null);
  const glowCircleRef = useRef<SVGCircleElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timestamp, setTimestamp] = useState("0:00");
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const progressRef = useRef(0);

  const duration = HERO_ANIMATION_DURATION_MS;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPaused(!entry.isIntersecting);
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

    startTimeRef.current = performance.now() - progressRef.current * duration;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const p = (elapsed % duration) / duration;
      progressRef.current = p;

      // Update timestamp (cheap — just text)
      setTimestamp(formatTime(p));

      // Update SVG elements directly via refs (bypass React render)
      const fillColor = p < 0.6 ? "#22c55e" : p < 0.85 ? "#eab308" : "#E63946";
      const playX = 8 + p * 56;

      if (fillPathRef.current) {
        fillPathRef.current.setAttribute("d", buildHeatmapPath(HEATMAP_DATA, p));
        fillPathRef.current.setAttribute("opacity", String(Math.min(p * 3, 1)));
      }
      if (strokePathRef.current) {
        strokePathRef.current.setAttribute("d", buildStrokePath(HEATMAP_DATA, p));
        strokePathRef.current.setAttribute("opacity", String(Math.min(p * 3, 1)));
      }
      if (playheadLineRef.current) {
        playheadLineRef.current.setAttribute("x1", String(playX));
        playheadLineRef.current.setAttribute("x2", String(playX));
        playheadLineRef.current.setAttribute("stroke", fillColor);
      }
      if (playheadCircleRef.current) {
        playheadCircleRef.current.setAttribute("cx", String(playX));
        playheadCircleRef.current.setAttribute("fill", fillColor);
      }
      if (glowCircleRef.current) {
        glowCircleRef.current.setAttribute("cx", String(playX));
        glowCircleRef.current.setAttribute("fill", fillColor);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPaused, duration]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "animated-heatmap relative w-full max-w-6xl mx-auto overflow-hidden rounded-2xl",
        "border-none bg-transparent shadow-none",
        className
      )}
      role="img"
      aria-label="Animated heatmap visualization showing viewer engagement"
    >
      <div className="relative aspect-video overflow-hidden bg-black/5 rounded-xl">
        {/* Top-left label */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-lg bg-black/40 backdrop-blur-sm px-3 py-1.5 border border-white/10">
          <Activity className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs font-medium text-white/90 tracking-wide">
            Viewer Heatmap
          </span>
        </div>

        {/* Top-right timestamp */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-sm px-3 py-1.5 border border-white/10">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
            {timestamp}
          </span>
          <span className="text-xs text-white/40 font-mono">
            / {formatTime(1)}
          </span>
        </div>

        {/* Heatmap SVG — all elements updated via refs, no React re-render */}
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="heroHeatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#E63946" />
            </linearGradient>
            <linearGradient id="heroFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E63946" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.2" />
            </linearGradient>
            <filter id="playGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Baseline */}
          <line x1="4" y1="48" x2="60" y2="48" stroke="white" strokeWidth="0.4" strokeLinecap="round" strokeOpacity="0.3" />

          {/* Scene boundary markers */}
          {SCENE_MARKERS.map((pos, i) => (
            <line
              key={i}
              x1={4 + pos * 56}
              y1="10"
              x2={4 + pos * 56}
              y2="48"
              stroke="white"
              strokeWidth="0.15"
              strokeOpacity="0.2"
              strokeDasharray="1 1"
            />
          ))}

          {/* Fill path — updated via ref */}
          <path ref={fillPathRef} d={`M4 48 L60 48 L60 49 L4 49 Z`} fill="url(#heroFillGrad)" opacity="0" />

          {/* Stroke path — updated via ref */}
          <path ref={strokePathRef} d={`M4 48 L60 48`} fill="none" stroke="url(#heroHeatGrad)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />

          {/* Playhead glow (larger, blurred) */}
          <circle ref={glowCircleRef} cx="8" cy="48" r="3" fill="#22c55e" opacity="0.3" filter="url(#playGlow)" />

          {/* Playhead line */}
          <line ref={playheadLineRef} x1="8" y1="6" x2="8" y2="50" stroke="#22c55e" strokeWidth="0.35" strokeOpacity="0.9" />

          {/* Playhead dot */}
          <circle ref={playheadCircleRef} cx="8" cy="48" r="1.5" fill="#22c55e" />
        </svg>
      </div>
    </div>
  );
}
