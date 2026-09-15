"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useJobApi } from "@/application/providers/api-provider";
import { ClipResponse, StudioExportConfig } from "../../domain/ports/job-api.port";
import { CLIP_STATUS } from "../../domain/entities/job";

interface ProgressEvent {
  jobId: string;
  clipId?: string;
  progress: number;
  step: string;
}

export function useExportClips(jobId: string | null) {
  const jobApi = useJobApi();
  const [clips, setClips] = useState<ClipResponse[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startSSE = useCallback(
    (jid: string) => {
      cleanup();

      const es = new EventSource(`/api/clips/job/${jid}/progress`, {
        withCredentials: true,
      });
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ProgressEvent;

          // Refresh clip list when a clip completes or fails
          if (data.step === "completed" || data.step === "failed") {
            jobApi.getClips(jid).then((currentClips) => {
              setClips(currentClips);
              const allDone = currentClips.every(
                (c) => c.status === CLIP_STATUS.COMPLETED || c.status === CLIP_STATUS.FAILED
              );
              if (allDone && currentClips.length > 0) {
                setIsExporting(false);
                es.close();
                eventSourceRef.current = null;
              }
            }).catch(() => {});
          }

          // Update individual clip progress if clipId is present
          if (data.clipId) {
            setClips((prev) =>
              prev.map((c) =>
                c.id === data.clipId
                  ? { ...c, progress: data.progress } as ClipResponse
                  : c
              )
            );
          }
        } catch {
          // Ignore malformed messages
        }
      };

      es.onerror = () => {
        // SSE connection lost — fall back to polling
        es.close();
        eventSourceRef.current = null;

        // Fallback: poll every 2s
        pollCountRef.current = 0;
        pollingRef.current = setInterval(async () => {
          pollCountRef.current++;
          if (pollCountRef.current >= 120) {
            cleanup();
            setIsExporting(false);
            setError("Export timed out. Please refresh and try again.");
            return;
          }
          try {
            const currentClips = await jobApi.getClips(jid);
            setClips(currentClips);
            const allDone = currentClips.every(
              (c) => c.status === CLIP_STATUS.COMPLETED || c.status === CLIP_STATUS.FAILED
            );
            if (allDone && currentClips.length > 0) {
              cleanup();
              setIsExporting(false);
            }
          } catch {
            // polling error — ignore, will retry
          }
        }, 2000);
      };
    },
    [cleanup, jobApi]
  );

  const exportClips = useCallback(
    async (
      scenes: Array<{ start_time: number; end_time: number; peak_intensity?: number }>,
      studioConfig?: StudioExportConfig
    ) => {
      if (!jobId) return;
      setIsExporting(true);
      setError(null);

      try {
        const result = await jobApi.exportClips(jobId, scenes, studioConfig);
        setClips(
          result.clipJobIds.map((id, i) => ({
            id,
            jobId: result.jobId,
            sceneIndex: i,
            startTime: scenes[i]?.start_time ?? 0,
            endTime: scenes[i]?.end_time ?? 0,
            status: CLIP_STATUS.PENDING,
            createdAt: new Date().toISOString(),
          }))
        );
        startSSE(jobId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setError(message);
        setIsExporting(false);
      }
    },
    [jobId, startSSE]
  );

  const loadClips = useCallback(async () => {
    if (!jobId) return;
    try {
      const currentClips = await jobApi.getClips(jobId);
      setClips(currentClips);
      if (currentClips.some((c) => c.status === CLIP_STATUS.PENDING || c.status === CLIP_STATUS.PROCESSING)) {
        setIsExporting(true);
        startSSE(jobId);
      }
    } catch {
      setError("Failed to load existing clips.");
    }
  }, [jobId, startSSE]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    clips,
    isExporting,
    error,
    exportClips,
    loadClips,
  };
}
