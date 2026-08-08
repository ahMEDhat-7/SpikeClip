"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorPageProps {
  title: string;
  message: string;
  error?: Error & { digest?: string };
  reset?: () => void;
}

export function ErrorPage({ title, message, error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && error) {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-2xl font-normal">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          {reset && <Button onClick={reset}>Try Again</Button>}
        </CardContent>
      </Card>
    </main>
  );
}
