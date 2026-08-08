"use client";

import { useRef, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { HeatmapSpike, ScoredBlock } from "@/domain/entities/job";
import { formatTime } from "@/lib/format";

interface HeatmapChartProps {
  heatmap: HeatmapSpike[];
  scenes?: ScoredBlock[];
  onSceneClick?: (scene: ScoredBlock) => void;
  addStartMarker?: number | null;
  hoverTime?: number | null;
  onChartClick?: (time: number) => void;
  onChartMouseMove?: (time: number | null) => void;
  interactive?: boolean;
}

export function HeatmapChart({
  heatmap,
  scenes = [],
  onSceneClick,
  addStartMarker = null,
  hoverTime = null,
  onChartClick,
  onChartMouseMove,
  interactive = false,
}: HeatmapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = heatmap.map((point) => ({
    time: point.start_time,
    intensity: point.value,
    label: formatTime(point.start_time),
  }));

  const handleClick = useCallback(
    (state: { activePayload?: Array<{ payload: { time: number } }> }) => {
      if (!interactive || !onChartClick) return;
      const payload = state?.activePayload?.[0]?.payload;
      if (payload) {
        onChartClick(payload.time);
      }
    },
    [interactive, onChartClick]
  );

  const handleMouseMove = useCallback(
    (state: { activePayload?: Array<{ payload: { time: number } }> }) => {
      if (!interactive || !onChartMouseMove) return;
      const payload = state?.activePayload?.[0]?.payload;
      if (payload) {
        onChartMouseMove(payload.time);
      }
    },
    [interactive, onChartMouseMove]
  );

  const handleMouseLeave = useCallback(() => {
    if (interactive && onChartMouseMove) {
      onChartMouseMove(null);
    }
  }, [interactive, onChartMouseMove]);

  return (
    <div
      ref={chartRef}
      className={`w-full h-full ${interactive ? "cursor-crosshair" : ""} transition-opacity duration-500`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E63946" stopOpacity={0.9} />
              <stop offset="40%" stopColor="#E63946" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#E63946" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="intensityGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E63946" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#E63946" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sceneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#FF6B35" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.15} />
          <XAxis
            dataKey="label"
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            fontFamily="var(--font-mono)"
            interval={Math.floor(data.length / 12)}
            minTickGap={25}
          />
          <YAxis
            domain={[0, 1]}
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            fontFamily="var(--font-mono)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "color-mix(in srgb, var(--color-card) 85%, transparent)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--color-hairline-strong)",
              borderRadius: "10px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
              padding: "8px 12px",
            }}
            formatter={(value: number) => [
              `${(value * 100).toFixed(0)}%`,
              "Intensity",
            ]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="intensity"
            stroke="none"
            fill="url(#intensityGlow)"
            strokeWidth={0}
          />
          <Area
            type="monotone"
            dataKey="intensity"
            stroke="#E63946"
            fill="url(#intensityGradient)"
            strokeWidth={2}
            activeDot={{
              r: 5,
              fill: "#E63946",
              stroke: "#fff",
              strokeWidth: 2,
              style: { filter: "drop-shadow(0 0 6px rgba(230,57,70,0.5))" },
            }}
          />
          {scenes.map((scene, i) => (
            <ReferenceArea
              key={i}
              x1={formatTime(scene.start_time)}
              x2={formatTime(scene.end_time)}
              fill="url(#sceneGradient)"
              stroke="#FF6B35"
              strokeOpacity={0.6}
              strokeWidth={1}
              strokeDasharray="4 2"
              onClick={() => onSceneClick?.(scene)}
              style={{
                cursor: onSceneClick ? "pointer" : "default",
                transition: "stroke-opacity 200ms ease, fill-opacity 200ms ease",
              }}
              onMouseEnter={(e: React.MouseEvent<SVGRectElement>) => {
                e.currentTarget.style.strokeOpacity = "1";
              }}
              onMouseLeave={(e: React.MouseEvent<SVGRectElement>) => {
                e.currentTarget.style.strokeOpacity = "0.6";
              }}
            />
          ))}
          {addStartMarker !== null && (
            <ReferenceLine
              x={formatTime(addStartMarker)}
              stroke="#22c55e"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: "Start",
                position: "top",
                fill: "#22c55e",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            />
          )}
          {hoverTime !== null && addStartMarker === null && (
            <ReferenceLine
              x={formatTime(hoverTime)}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
