"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ExternalLink, Play, Download, Sparkles, Loader2 } from "lucide-react";

interface SourceItem {
  id: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  sourceStatus: string;
  mediaStatus: string;
  viewCount: number | null;
}

interface SourceListProps {
  sources: SourceItem[];
  onRemove?: (sourceId: string) => void;
  onGenerateScenes?: (sourceId: string) => void;
  generatingSourceId?: string | null;
  compact?: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCount(count: number | null): string {
  if (!count) return "0";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function getStatusBadge(status: string) {
  switch (status) {
    case "available":
      return <Badge variant="default">Ready</Badge>;
    case "downloading":
      return <Badge variant="secondary">Downloading</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "not_downloaded":
      return <Badge variant="outline">Not Downloaded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SourceList({ sources, onRemove, onGenerateScenes, generatingSourceId, compact = false }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
        <p className="text-sm text-muted-foreground">No sources added yet</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 rounded-md border p-2"
          >
            {source.thumbnailUrl ? (
              <img
                src={source.thumbnailUrl}
                alt={source.title ?? "Video"}
                className="h-12 w-16 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-16 items-center justify-center rounded bg-muted">
                <Play className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{source.title ?? "Untitled"}</p>
              <p className="text-xs text-muted-foreground">{formatDuration(source.duration)}</p>
            </div>
            {getStatusBadge(source.mediaStatus)}
            {onGenerateScenes && source.sourceStatus !== "analyzing" && source.sourceStatus !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                disabled={generatingSourceId === source.id}
                onClick={() => onGenerateScenes(source.id)}
              >
                {generatingSourceId === source.id ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                Analyze
              </Button>
            )}
            {source.sourceStatus === "analyzing" && (
              <Badge variant="secondary">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Analyzing
              </Badge>
            )}
            {source.sourceStatus === "completed" && (
              <Badge variant="default">
                <Sparkles className="mr-1 h-3 w-3" />
                Analyzed
              </Badge>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onRemove(source.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {sources.map((source) => (
        <Card key={source.id}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {source.thumbnailUrl ? (
                <img
                  src={source.thumbnailUrl}
                  alt={source.title ?? "Video"}
                  className="h-24 w-40 rounded object-cover"
                />
              ) : (
                <div className="flex h-24 w-40 items-center justify-center rounded bg-muted">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="line-clamp-2 text-sm font-medium">{source.title ?? "Untitled"}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDuration(source.duration)}</span>
                  <span>{formatCount(source.viewCount)} views</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusBadge(source.mediaStatus)}
                  {onGenerateScenes && source.sourceStatus !== "analyzing" && source.sourceStatus !== "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={generatingSourceId === source.id}
                      onClick={() => onGenerateScenes(source.id)}
                    >
                      {generatingSourceId === source.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3 w-3" />
                      )}
                      Analyze
                    </Button>
                  )}
                  {source.sourceStatus === "analyzing" && (
                    <Badge variant="secondary">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Analyzing
                    </Badge>
                  )}
                  {source.sourceStatus === "completed" && (
                    <Badge variant="default">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Analyzed
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={source.youtubeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemove(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
