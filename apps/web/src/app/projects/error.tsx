"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Projects error"
      message="Failed to load your projects. Please try again."
      error={error}
      reset={reset}
    />
  );
}
