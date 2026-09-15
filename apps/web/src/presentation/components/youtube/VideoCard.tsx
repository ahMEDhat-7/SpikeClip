"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Clock, Eye, ThumbsUp } from "lucide-react";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    duration: string;
    publishedAt: string;
    viewCount: string;
    likeCount: string;
    privacyStatus?: string;
  };
  onAdd?: (videoId: string) => void;
  onRemove?: (videoId: string) => void;
  isAdded?: boolean;
  showAddButton?: boolean;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCount(count: string): string {
  const num = parseInt(count) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function VideoCard({ video, onAdd, onRemove, isAdded = false, showAddButton = true }: VideoCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnailUrl && !imageError ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {formatDuration(video.duration)}
        </div>
        {video.privacyStatus && video.privacyStatus !== "public" && (
          <div className="absolute top-2 left-2">
            <Badge variant={video.privacyStatus === "private" ? "destructive" : "secondary"}>
              {video.privacyStatus}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{video.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatCount(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {formatCount(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(video.publishedAt)}
          </span>
        </div>

        {showAddButton && (
          <div className="mt-3">
            {isAdded ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onRemove?.(video.id)}
              >
                Remove
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => onAdd?.(video.id)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Source
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
