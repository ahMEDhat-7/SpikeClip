"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { JOB_STATUS } from "@/domain/entities/job";
import type { JobStatusValue } from "@spikeclip/shared";

interface ProgressEvent {
  jobId: string;
  clipId?: string;
  progress: number;
  step: string;
}

export function useAnalysisProgress(isLoading: boolean, jobStatus?: JobStatusValue, jobId?: string) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [step, setStep] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanup();

    if (!isLoading || !jobId) {
      if (jobStatus === JOB_STATUS.COMPLETED) {
        setProgress(100);
        setStep("completed");
      } else if (jobStatus === JOB_STATUS.FAILED) {
        setProgress(0);
        setStep("failed");
      }
      return;
    }

    startTimeRef.current = Date.now();
    setProgress(0);
    setElapsedTime(0);
    setStep("connecting");

    // Track elapsed time
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);
    }, 500);

    // Connect to SSE endpoint
    const es = new EventSource(`/api/jobs/${jobId}/progress`, {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent;
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }
        if (data.step) {
          setStep(data.step);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      // SSE connection lost — fall back to elapsed-based estimation
      es.close();
      eventSourceRef.current = null;

      // Use elapsed time as fallback progress
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedTime(elapsed);
        const estimated = Math.min(90, (elapsed / 60) * 90);
        setProgress((prev) => Math.max(prev, estimated));
      }, 500);
    };

    return cleanup;
  }, [isLoading, jobStatus, jobId, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setProgress(0);
    setElapsedTime(0);
    setStep("");
  }, [cleanup]);

  return { progress, elapsedTime, step, reset };
}
