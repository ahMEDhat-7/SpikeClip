"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function FeaturesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Something went wrong"
      message="Could not load this page. Please try again."
      error={error}
      reset={reset}
    />
  );
}
