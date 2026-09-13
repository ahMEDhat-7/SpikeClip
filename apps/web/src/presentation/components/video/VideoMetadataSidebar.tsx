"use client";

interface VideoMetadata {
  title?: string | null;
  thumbnailUrl?: string | null;
  channelName?: string | null;
  channelThumbnail?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  publishedAt?: string | null;
  duration?: number | null;
}

interface VideoMetadataSidebarProps {
  metadata: VideoMetadata;
}

function formatViewCount(count: number | null | undefined): string {
  if (count == null) return "—";
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoMetadataSidebar({ metadata }: VideoMetadataSidebarProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {metadata.thumbnailUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={metadata.thumbnailUrl}
            alt={metadata.title ?? "Video thumbnail"}
            className="w-full h-full object-cover"
          />
          {metadata.duration != null && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
              {formatDuration(metadata.duration)}
            </div>
          )}
        </div>
      )}

      {metadata.title && (
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">
          {metadata.title}
        </h3>
      )}

      <div className="flex items-center gap-2">
        {metadata.channelThumbnail && (
          <img
            src={metadata.channelThumbnail}
            alt={metadata.channelName ?? "Channel"}
            className="w-6 h-6 rounded-full"
          />
        )}
        {metadata.channelName && (
          <span className="text-xs text-muted-foreground truncate">
            {metadata.channelName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-0.5">
          <div className="text-muted-foreground">Views</div>
          <div className="font-mono font-medium">{formatViewCount(metadata.viewCount)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground">Likes</div>
          <div className="font-mono font-medium">{formatViewCount(metadata.likeCount)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground">Published</div>
          <div className="font-medium">{formatRelativeDate(metadata.publishedAt)}</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground">Comments</div>
          <div className="font-mono font-medium">{formatViewCount(metadata.commentCount)}</div>
        </div>
      </div>
    </div>
  );
}
