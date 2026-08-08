"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/application/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { GlowOrb } from "@/presentation/components/features/GlowOrb";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.includes("://")
      ? rawCallbackUrl
      : "/dashboard";
  const { user, isLoading: authLoading } = useAuth();
  const [redirectError, setRedirectError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push(callbackUrl);
    }
  }, [user, authLoading, router, callbackUrl]);

  const handleGoogleSignIn = () => {
    setSigningIn(true);
    window.location.href = "/api/auth/google";
  };

  if (authLoading || user) {
    return (
      <main className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="relative container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <DotsBackground opacity={0.3} />
      <GlowOrb className="top-1/4 left-1/4" size={300} />
      <GlowOrb className="bottom-1/4 right-1/4" size={250} color="hsl(210, 80%, 50%)" />
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mx-auto">
            <img src="/logo.svg" alt="SpikeClip logo" className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-normal tracking-tight">Welcome to SpikeClip</h1>
          <p className="text-sm text-muted-foreground">
            Extract the most replayed moments from any YouTube video
          </p>
        </div>

        {redirectError ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">Unable to connect to the authentication service.</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please check your connection and try again.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-medium"
          >
            {signingIn ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <GoogleIcon className="h-5 w-5 mr-2" />
            )}
            {signingIn ? "Redirecting to Google..." : "Continue with Google"}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
