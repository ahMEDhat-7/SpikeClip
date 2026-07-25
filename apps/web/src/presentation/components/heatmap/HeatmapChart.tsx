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
      className={`w-full h-full ${interactive ? "cursor-crosshair" : ""}`}
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
              <stop offset="5%" stopColor="#E63946" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#E63946" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="sceneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
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
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
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
            stroke="#E63946"
            fill="url(#intensityGradient)"
            strokeWidth={2}
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
              style={{ cursor: onSceneClick ? "pointer" : "default" }}
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
