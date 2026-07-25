"use client";

import { ErrorPage } from "@/presentation/components/ui/error-page";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPage
      title="Login Error"
      message="Something went wrong during login. Please try again."
      error={error}
      reset={reset}
    />
  );
}
