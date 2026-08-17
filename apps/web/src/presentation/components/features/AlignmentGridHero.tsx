"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BarChart3,
  Zap,
  Smartphone,
  Timer,
  Target,
  Rocket,
  Sparkles,
  Palette,
  type LucideIcon,
} from "lucide-react";
import {
  createSpringBody,
  stepSpring,
  type SpringBody,
} from "@/lib/physics/spring";

interface ShapeConfig {
  id: string;
  label: string;
  color: string;
  colorDark: string;
  size: { w: number; h: number };
  borderRadius: string;
  icon: LucideIcon;
}

const SHAPES: ShapeConfig[] = [
  {
    id: "heatmap",
    label: "Heatmap",
    color: "hsl(350 80% 55%)",
    colorDark: "hsl(350 80% 58%)",
    size: { w: 110, h: 110 },
    borderRadius: "50%",
    icon: BarChart3,
  },
  {
    id: "algorithm",
    label: "Algorithm",
    color: "hsl(152 60% 45%)",
    colorDark: "hsl(152 60% 50%)",
    size: { w: 110, h: 110 },
    borderRadius: "24px",
    icon: Zap,
  },
  {
    id: "vertical",
    label: "9:16",
    color: "hsl(214 70% 55%)",
    colorDark: "hsl(214 70% 60%)",
    size: { w: 90, h: 130 },
    borderRadius: "20px",
    icon: Smartphone,
  },
  {
    id: "instant",
    label: "Instant",
    color: "hsl(28 85% 55%)",
    colorDark: "hsl(28 85% 60%)",
    size: { w: 100, h: 100 },
    borderRadius: "20px",
    icon: Timer,
  },
  {
    id: "data",
    label: "Data",
    color: "hsl(270 60% 55%)",
    colorDark: "hsl(270 60% 60%)",
    size: { w: 110, h: 110 },
    borderRadius: "28px 28px 28px 4px",
    icon: Target,
  },
  {
    id: "export",
    label: "Export",
    color: "hsl(175 60% 40%)",
    colorDark: "hsl(175 60% 48%)",
    size: { w: 130, h: 80 },
    borderRadius: "16px",
    icon: Rocket,
  },
  {
    id: "studio",
    label: "Studio",
    color: "hsl(330 70% 55%)",
    colorDark: "hsl(330 70% 60%)",
    size: { w: 80, h: 80 },
    borderRadius: "50%",
    icon: Sparkles,
  },
  {
    id: "templates",
    label: "Templates",
    color: "hsl(45 85% 50%)",
    colorDark: "hsl(45 85% 55%)",
    size: { w: 85, h: 85 },
    borderRadius: "16px",
    icon: Palette,
  },
];

interface GridCell {
  x: number;
  y: number;
}

function computeGridTargets(
  containerWidth: number,
  shapes: ShapeConfig[]
): GridCell[] {
  const cols = containerWidth > 700 ? 4 : containerWidth > 450 ? 3 : 2;
  const cellW = Math.min(160, (containerWidth - 80) / cols);
  const cellH = cellW;
  const startX = (containerWidth - cols * cellW) / 2;
  const startY = 40;

  return shapes.map((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: startX + col * cellW + (cellW - shapes[i].size.w) / 2,
      y: startY + row * cellH + (cellH - shapes[i].size.h) / 2,
    };
  });
}

function randomScatter(containerWidth: number, containerHeight: number): GridCell[] {
  return SHAPES.map((shape) => ({
    x: Math.random() * (containerWidth - shape.size.w),
    y: Math.random() * (containerHeight - shape.size.h) * 0.4 - containerHeight * 0.2,
  }));
}

export function AlignmentGridHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<SpringBody[]>([]);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const shapesRevealedRef = useRef<boolean[]>(new Array(SHAPES.length).fill(false));
  const [revealedCount, setRevealedCount] = useState(0);
  const [settled, setSettled] = useState(false);

  const initBodies = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const scatterPos = randomScatter(w, h);
    const gridTargets = computeGridTargets(w, SHAPES);

    bodiesRef.current = SHAPES.map((shape, i) =>
      createSpringBody(
        scatterPos[i].x,
        scatterPos[i].y,
        gridTargets[i].x,
        gridTargets[i].y,
        (Math.random() - 0.5) * 30,
        0,
        0.4,
        1
      )
    );
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const elapsed = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    // Cap dt to prevent explosion on tab switch
    const dt = Math.min(elapsed, 0.064);

    let allSettled = true;
    const container = containerRef.current;
    const isDark = container?.classList.contains("dark") ?? false;

    bodiesRef.current.forEach((body, i) => {
      const isAtRest = stepSpring(body, dt, {
        stiffness: 60 + i * 5,
        damping: 14 + i * 1.2,
      });

      if (!isAtRest) allSettled = false;

      // Apply position to DOM element directly (bypass React)
      const el = container?.querySelector(`[data-shape="${SHAPES[i].id}"]`) as HTMLElement;
      if (el) {
        el.style.transform = `translate(${body.x}px, ${body.y}px) scale(${body.scale}) rotate(${body.rotation}deg)`;

        // Reveal shapes with stagger
        if (!shapesRevealedRef.current[i] && body.scale > 0.7) {
          shapesRevealedRef.current[i] = true;
          setRevealedCount((c) => c + 1);
        }
      }
    });

    if (allSettled && !settled) {
      setSettled(true);
    }

    if (!allSettled || !settled) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [settled]);

  // Start animation on mount
  useEffect(() => {
    initBodies();
    // Small delay so initial positions render before spring starts
    const timer = setTimeout(() => {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initBodies, animate]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (settled) {
        // Recompute targets on resize
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const targets = computeGridTargets(rect.width, SHAPES);
        bodiesRef.current.forEach((body, i) => {
          body.tx = targets[i].x;
          body.ty = targets[i].y;
        });
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [settled, animate]);

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto"
      style={{ height: SHAPES.length > 4 ? 380 : 280 }}
    >
      {/* Shapes — spring-animated, on top of dots */}
      {SHAPES.map((shape, i) => {
        const Icon = shape.icon;
        return (
          <div
            key={shape.id}
            data-shape={shape.id}
            className="absolute top-0 left-0 will-change-transform"
            style={{
              width: shape.size.w,
              height: shape.size.h,
              borderRadius: shape.borderRadius,
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-hairline)",
              boxShadow: `0 2px 12px ${shape.color}20, 0 0 0 1px ${shape.color}15`,
              opacity: shapesRevealedRef.current[i] ? 1 : 0,
              transition: "opacity 0.3s ease-out, box-shadow 0.3s ease-out",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `${shape.color}18`,
                color: shape.color,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{
                color: "var(--color-foreground)",
                letterSpacing: "var(--tracking-wide, 0.06em)",
              }}
            >
              {shape.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
