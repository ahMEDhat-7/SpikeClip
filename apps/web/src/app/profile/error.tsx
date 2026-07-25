"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Profile error"
      message="Failed to load your profile. Please try again."
      error={error}
      reset={reset}
    />
  );
}
