"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Something went wrong"
      message="An unexpected error occurred. Please try again."
      error={error}
      reset={reset}
    />
  );
}
