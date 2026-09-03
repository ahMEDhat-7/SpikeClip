"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useJobApi } from "@/application/providers/api-provider";
import { Job, JOB_STATUS } from "../../domain/entities/job";
import { ANALYSIS_POLL_INTERVAL_MS, ANALYSIS_MAX_POLL_ATTEMPTS } from "@/lib/constants";

export function useAnalyzeVideo(onComplete?: () => void) {
  const jobApi = useJobApi();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    attemptRef.current = 0;
  }, []);

  const pollJobStatus = useCallback(
    (jobId: string) => {
      stopPolling();

      pollingRef.current = setInterval(async () => {
        attemptRef.current += 1;

        if (attemptRef.current >= ANALYSIS_MAX_POLL_ATTEMPTS) {
          stopPolling();
          setError("Analysis timed out. Please refresh and try again.");
          setIsLoading(false);
          return;
        }

        try {
          const updated = await jobApi.getJob(jobId);
          setJob(updated);

          if (updated.status === JOB_STATUS.COMPLETED || updated.status === JOB_STATUS.FAILED) {
            stopPolling();
            setIsLoading(false);
            if (updated.status === JOB_STATUS.COMPLETED) {
              onComplete?.();
            }
          }
        } catch {
          stopPolling();
          setIsLoading(false);
          setError("Failed to check analysis status.");
        }
      }, ANALYSIS_POLL_INTERVAL_MS);
    },
    [stopPolling, onComplete]
  );

  const analyze = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setError(null);
      stopPolling();

      try {
        // Create job — server automatically enqueues analysis via BullMQ worker
        const newJob = await jobApi.createJob(url);
        setJob(newJob);

        if (newJob.status === JOB_STATUS.COMPLETED) {
          setIsLoading(false);
          onComplete?.();
        } else if (newJob.status === JOB_STATUS.PROCESSING || newJob.status === JOB_STATUS.PENDING) {
          pollJobStatus(newJob.id);
        } else {
          setIsLoading(false);
          if (newJob.status === JOB_STATUS.FAILED) {
            setError(newJob.errorMessage || "Analysis failed.");
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        setIsLoading(false);
      }
    },
    [onComplete, pollJobStatus, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setError(null);
    setIsLoading(false);
  }, [stopPolling]);

  const loadJob = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await jobApi.getJob(id);
      setJob(loaded);
      if (loaded.status === JOB_STATUS.PROCESSING || loaded.status === JOB_STATUS.PENDING) {
        pollJobStatus(loaded.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load job";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [pollJobStatus]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return { job, isLoading, error, analyze, loadJob, reset };
}
