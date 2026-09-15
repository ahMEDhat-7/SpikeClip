"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link } from "lucide-react";

interface UrlSourceInputProps {
  onAddUrl: (url: string) => Promise<void>;
  disabled?: boolean;
}

const YOUTUBE_URL_PATTERN = /(?:youtube\.com\/watch\?.*?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;

export function UrlSourceInput({ onAddUrl, disabled }: UrlSourceInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!YOUTUBE_URL_PATTERN.test(url)) {
      setError("Invalid YouTube URL");
      return;
    }

    setLoading(true);
    try {
      await onAddUrl(url);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Paste YouTube URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading || disabled}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading || !url.trim() || disabled}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Source"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
