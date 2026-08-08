"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-2xl font-normal">Something went wrong</h2>
            <p className="text-muted-foreground">
              A critical error occurred. Please try again.
            </p>
            <Button onClick={reset}>Try Again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
