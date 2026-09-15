"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoCard } from "./VideoCard";
import { useYoutubeApi } from "@/application/providers/api-provider";
import { Loader2, Search, ChevronLeft, ChevronRight, Youtube } from "lucide-react";
import type { YoutubeVideo } from "@/domain/ports/youtube-api.port";

interface VideoBrowserProps {
  onAddVideo?: (videoId: string) => void;
  onRemoveVideo?: (videoId: string) => void;
  addedVideoIds?: Set<string>;
  showAddButton?: boolean;
}

export function VideoBrowser({ onAddVideo, onRemoveVideo, addedVideoIds = new Set(), showAddButton = true }: VideoBrowserProps) {
  const youtubeApi = useYoutubeApi();
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [prevPageTokens, setPrevPageTokens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadVideos = useCallback(async (pageToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await youtubeApi.listVideos({ maxResults: 12, pageToken });
      setVideos(result.items);
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [youtubeApi]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleNextPage = () => {
    if (nextPageToken) {
      setPrevPageTokens((prev) => [...prev, nextPageToken ?? ""]);
      loadVideos(nextPageToken);
    }
  };

  const handlePrevPage = () => {
    if (prevPageTokens.length > 0) {
      const tokens = [...prevPageTokens];
      const prevToken = tokens.pop();
      setPrevPageTokens(tokens);
      loadVideos(prevToken || undefined);
    }
  };

  const filteredVideos = videos.filter((video) =>
    searchQuery ? video.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <Youtube className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => loadVideos()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={prevPageTokens.length === 0}
            onClick={handlePrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={!nextPageToken}
            onClick={handleNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isAdded={addedVideoIds.has(video.id)}
              onAdd={onAddVideo}
              onRemove={onRemoveVideo}
              showAddButton={showAddButton}
            />
          ))}
        </div>
      )}
    </div>
  );
}
