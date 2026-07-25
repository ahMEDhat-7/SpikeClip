"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Studio error"
      message="The editor encountered an error. Please refresh the page."
      error={error}
      reset={reset}
    />
  );
}
