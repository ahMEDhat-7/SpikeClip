"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { JOB_STATUS } from "@/domain/entities/job";
import type { JobStatusValue } from "@spikeclip/shared";

export function useAnalysisProgress(isLoading: boolean, jobStatus?: JobStatusValue) {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      startTimeRef.current = Date.now();
      setProgress(0);
      setElapsedTime(0);

      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedTime(elapsed);
        const estimated = Math.min(90, (elapsed / 60) * 90);
        setProgress(estimated);
      }, 500);
    } else if (jobStatus === JOB_STATUS.COMPLETED) {
      setProgress(100);
    } else if (jobStatus === JOB_STATUS.FAILED) {
      setProgress(0);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isLoading, jobStatus]);

  const reset = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setProgress(0);
    setElapsedTime(0);
  }, []);

  return { progress, elapsedTime, reset };
}
