"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Dashboard error"
      message="Failed to load your dashboard. Please try again."
      error={error}
      reset={reset}
    />
  );
}
