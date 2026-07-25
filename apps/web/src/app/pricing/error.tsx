"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Something went wrong"
      message="Could not load pricing information. Please try again."
      error={error}
      reset={reset}
    />
  );
}
