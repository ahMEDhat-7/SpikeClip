"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnalyzeVideo } from "@/application/hooks/use-analyze-video";
import { useAuth } from "@/application/hooks/use-auth";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { PlatformSelector } from "@/presentation/components/studio/PlatformSelector";
import { SceneSelector } from "@/presentation/components/studio/SceneSelector";
import { Platform, PLATFORMS } from "@/domain/entities/platform";
import { Job, JOB_STATUS } from "@/domain/entities/job";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowLeft, AlertTriangle, Clock, Eye } from "lucide-react";
import Link from "next/link";
import { toastError } from "@/lib/toast";

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();

  const { job, isLoading, error, analyze, loadJob } = useAnalyzeVideo(() => {
    void refreshUser();
  });

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [urlInput, setUrlInput] = useState("");

  // Tab sync: when another tab exports a clip, refresh user counters
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "clip-exported") void refreshUser();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshUser]);

  // Load job from URL params
  useEffect(() => {
    if (jobIdFromUrl && !job) {
      void loadJob(jobIdFromUrl);
    }
  }, [jobIdFromUrl, job, loadJob]);

  const handleAnalyze = useCallback(async () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toastError("Please enter a valid YouTube URL.");
      return;
    }
    await analyze(url);
  }, [urlInput, analyze]);

  const handleSceneEdit = useCallback(
    (start: number, end: number) => {
      if (!job || !selectedPlatform) return;
      window.open(
        `/studio/editor?jobId=${job.id}&start=${start}&end=${end}&platform=${selectedPlatform.id}`,
        "_blank"
      );
    },
    [job, selectedPlatform]
  );

  const isCompleted = job?.status === JOB_STATUS.COMPLETED;
  const hasScenes = isCompleted && (job?.scenes?.length ?? 0) > 0;

  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Desktop Only</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Clip Studio requires a larger screen to edit scenes.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Studio</h1>
            {user && user.plan === "free" && (
              <Badge variant="secondary" className="font-mono text-xs">
                {user.analysesUsed}/{user.analysesLimit} analyses
              </Badge>
            )}
          </div>
        </div>

        {/* URL Input — show when no job loaded */}
        {!job && !isLoading && (
          <Card>
            <CardContent className="p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleAnalyze();
                }}
                className="flex gap-2"
              >
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isLoading}
                  className="text-sm"
                />
                <Button type="submit" disabled={isLoading || !urlInput.trim()} size="sm" className="h-9 px-3">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Videos must be at least 3 days old with 1,000+ views for heatmap data to be available.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error — inline warning card with contextual help */}
        {error && (
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{error}</p>
                  {error.toLowerCase().includes("less than") && error.toLowerCase().includes("days") && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      <span>YouTube typically generates heatmap data 3–7 days after upload. Your analysis quota was not used.</span>
                    </div>
                  )}
                  {error.toLowerCase().includes("views") && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <Eye className="h-3 w-3" />
                      <span>Heatmap data requires sufficient viewer engagement. Your analysis quota was not used.</span>
                    </div>
                  )}
                  {error.toLowerCase().includes("no heatmap") && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      <span>This video may not have heatmap data available yet. Your analysis quota was not used.</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Analyzing video...
            </CardContent>
          </Card>
        )}

        {/* Job loaded */}
        {job && (
          <>
            {/* Video info */}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                {job.videoThumbnail && (
                  <img
                    src={job.videoThumbnail}
                    alt={job.videoTitle || "Video"}
                    className="w-32 h-auto rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">{job.videoTitle}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isCompleted ? "default" : "secondary"} className="capitalize">
                      {job.status}
                    </Badge>
                    {job.videoDuration && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.floor(job.videoDuration / 60)}:{(job.videoDuration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void loadJob("");
                    setUrlInput("");
                    setSelectedPlatform(null);
                    router.push("/studio");
                  }}
                  className="shrink-0"
                >
                  Change Video
                </Button>
              </CardContent>
            </Card>

            {/* Step 1: Platform selection (required before scenes) */}
            {!selectedPlatform && isCompleted && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold">Select Target Platform</h2>
                <PlatformSelector selected={selectedPlatform} onSelect={setSelectedPlatform} />
              </div>
            )}

            {/* Step 2: Scene browser (after platform selected) */}
            {selectedPlatform && hasScenes && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Select a Scene to Edit</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Platform: {selectedPlatform.name} ({selectedPlatform.aspectRatio}, max {selectedPlatform.maxDuration}s)
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlatform(null)}
                    className="text-xs"
                  >
                    Change Platform
                  </Button>
                </div>
                <SceneSelector
                  scenes={job.scenes ?? []}
                  videoDuration={job.videoDuration ?? 0}
                  onEdit={handleSceneEdit}
                />
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!job && !isLoading && (
          <div className="text-center py-16 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto">
              <img src="/logo.svg" alt="Clutch" className="h-8 w-8 opacity-40" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium">Analyze a YouTube Video</p>
              <p className="text-sm text-muted-foreground">
                Paste a YouTube URL above to extract heatmap data and find the most-replayed moments.
              </p>
            </div>
            {user?.plan === "free" && (
              <div className="text-xs text-muted-foreground/60 space-y-1">
                <p>Analyses: {user.analysesUsed}/{user.analysesLimit} used this month</p>
                <p>Clips: {user.clipsUsed}/{user.clipsLimit} exported this month</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
