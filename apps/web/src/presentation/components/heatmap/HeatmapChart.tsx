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
  onDragCreate?: (startTime: number, endTime: number) => void;
  interactive?: boolean;
  dragPreview?: { start: number; end: number } | null;
}

export function HeatmapChart({
  heatmap,
  scenes = [],
  onSceneClick,
  addStartMarker = null,
  hoverTime = null,
  onChartClick,
  onChartMouseMove,
  onDragCreate,
  interactive = false,
  dragPreview = null,
}: HeatmapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  const data = heatmap.map((point) => ({
    time: point.start_time,
    intensity: point.value,
    label: formatTime(point.start_time),
  }));

  const getTimeFromMouseEvent = useCallback(
    (e: React.MouseEvent): number | null => {
      if (!chartRef.current) return null;
      const rect = chartRef.current.querySelector(".recharts-wrapper");
      if (!rect) return null;

      const chartArea = chartRef.current.querySelector(".recharts-surface");
      if (!chartArea) return null;

      const bounds = chartArea.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const fraction = Math.max(0, Math.min(1, x / bounds.width));

      const maxTime = heatmap.length > 0 ? heatmap[heatmap.length - 1].start_time : 100;
      return fraction * maxTime;
    },
    [heatmap]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!interactive || !onDragCreate) return;
      const time = getTimeFromMouseEvent(e);
      if (time === null) return;

      setIsDragging(true);
      setDragStart(time);
      setDragCurrent(time);
    },
    [interactive, onDragCreate, getTimeFromMouseEvent]
  );

  const handleMouseMove = useCallback(
    (state: { activePayload?: Array<{ payload: { time: number } }> }) => {
      const payload = state?.activePayload?.[0]?.payload;

      if (isDragging && payload) {
        setDragCurrent(payload.time);
        return;
      }

      if (interactive && onChartMouseMove && payload) {
        onChartMouseMove(payload.time);
      }
    },
    [isDragging, interactive, onChartMouseMove]
  );

  const handleMouseUp = useCallback(
    (state: { activePayload?: Array<{ payload: { time: number } }> }) => {
      if (!isDragging || dragStart === null) return;

      const payload = state?.activePayload?.[0]?.payload;
      const endTime = payload?.time ?? dragCurrent ?? dragStart;

      const start = Math.min(dragStart, endTime);
      const end = Math.max(dragStart, endTime);

      if (end - start >= 1 && onDragCreate) {
        onDragCreate(start, end);
      }

      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    },
    [isDragging, dragStart, dragCurrent, onDragCreate]
  );

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    }
    if (interactive && onChartMouseMove) {
      onChartMouseMove(null);
    }
  }, [isDragging, interactive, onChartMouseMove]);

  const handleClick = useCallback(
    (state: { activePayload?: Array<{ payload: { time: number } }> }) => {
      if (isDragging || !interactive || !onChartClick) return;
      const payload = state?.activePayload?.[0]?.payload;
      if (payload) {
        onChartClick(payload.time);
      }
    },
    [isDragging, interactive, onChartClick]
  );

  const activeDragStart = dragPreview?.start ?? (isDragging && dragStart !== null ? dragStart : null);
  const activeDragEnd = dragPreview?.end ?? (isDragging && dragCurrent !== null ? dragCurrent : null);

  return (
    <div
      ref={chartRef}
      className={`w-full h-full ${interactive ? "cursor-crosshair" : ""} transition-opacity duration-500`}
      onMouseDown={handleMouseDown}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
            <linearGradient id="dragGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
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
          {activeDragStart !== null && activeDragEnd !== null && (
            <ReferenceArea
              x1={formatTime(Math.min(activeDragStart, activeDragEnd))}
              x2={formatTime(Math.max(activeDragStart, activeDragEnd))}
              fill="url(#dragGradient)"
              stroke="#22c55e"
              strokeOpacity={0.8}
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}
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
          {hoverTime !== null && addStartMarker === null && !isDragging && (
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
