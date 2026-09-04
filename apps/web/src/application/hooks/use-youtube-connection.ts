"use client";

import { useState, useEffect, useCallback } from "react";
import { useYoutubeApi } from "@/application/providers/api-provider";
import type { YoutubeConnection, YoutubeChannel } from "@/domain/ports/youtube-api.port";

interface UseYoutubeConnectionReturn {
  connected: boolean;
  connections: YoutubeConnection[];
  channel: YoutubeChannel | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: (connectionId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useYoutubeConnection(): UseYoutubeConnectionReturn {
  const youtubeApi = useYoutubeApi();
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<YoutubeConnection[]>([]);
  const [channel, setChannel] = useState<YoutubeChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const status = await youtubeApi.getStatus();
      setConnected(status.connected);
      setConnections(status.connections);

      if (status.connected) {
        const ch = await youtubeApi.getChannel();
        setChannel(ch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load YouTube status");
    }
  }, [youtubeApi]);

  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
  }, [loadStatus]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await youtubeApi.connect();
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect YouTube");
      throw err;
    }
  }, [youtubeApi, loadStatus]);

  const disconnect = useCallback(async (connectionId: string) => {
    setError(null);
    try {
      await youtubeApi.disconnect(connectionId);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect YouTube");
      throw err;
    }
  }, [youtubeApi, loadStatus]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  return { connected, connections, channel, loading, error, connect, disconnect, refresh };
}
