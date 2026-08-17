"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { UrlInput } from "@/presentation/components/jobs/UrlInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SkeletonDashboard } from "@/components/ui/skeleton-variants";
import { useAnalyzeVideo } from "@/application/hooks/use-analyze-video";
import { useAuth } from "@/application/hooks/use-auth";
import { JOB_STATUS } from "@/domain/entities/job";
import { SceneEditor } from "@/presentation/components/scenes/SceneEditor";
import { EditableScene } from "@/application/hooks/use-scene-editor";
import { VideoScenePreview } from "@/presentation/components/video/VideoScenePreview";
import { History, ArrowLeft, ExternalLink, Clock, AlertTriangle, Eye } from "lucide-react";
import { useAnalysisProgress } from "@/lib/hooks/use-analysis-progress";
import { useJobHistory } from "@/lib/hooks/use-job-history";

function DashboardContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();

  const { job, isLoading, error, analyze, loadJob } = useAnalyzeVideo(refreshUser);
  const { jobHistory } = useJobHistory(user?.id);
  const { progress, elapsedTime } = useAnalysisProgress(isLoading, job?.status);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | undefined>(undefined);
  const [editedScenes, setEditedScenes] = useState<EditableScene[]>([]);
  const isProcessing = job?.status === JOB_STATUS.PROCESSING;
  const isCompleted = job?.status === JOB_STATUS.COMPLETED;

  return (
    <main className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}>Dashboard</h1>
          {user && (
            <>
              {user.plan === "free" && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {user.analysesUsed}/{user.analysesLimit}
                </Badge>
              )}
              {user.plan !== "free" && (
                <Badge className="capitalize">{user.plan}</Badge>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            disabled={jobHistory.length === 0}
          >
            <History className="h-4 w-4 mr-1" />
            History {jobHistory.length > 0 ? `(${jobHistory.length})` : ""}
          </Button>
        </div>
      </div>

      {showHistory && jobHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Jobs</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {jobHistory.slice(0, 10).map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setShowHistory(false);
                  loadJob(j.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowHistory(false);
                    loadJob(j.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {j.videoThumbnail && (
                    <img
                      src={j.videoThumbnail}
                      alt={j.videoTitle || "Video thumbnail"}
                      className="w-16 h-9 object-cover rounded-md"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {j.videoTitle || j.url}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(j.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={j.status === JOB_STATUS.COMPLETED ? "default" : "secondary"}
                  className="shrink-0 capitalize"
                >
                  {j.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <UrlInput onSubmit={analyze} isLoading={isLoading} />
      <p className="text-xs text-muted-foreground -mt-4">
        Videos must be at least 3 days old with 1,000+ views for heatmap data to be available.
      </p>

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

      {isLoading && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Analyzing video</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{Math.floor(elapsedTime)}s elapsed</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono">{Math.round(progress)}%</span>
                <span className="text-xs text-muted-foreground">
                  {progress < 30 ? "Validating URL..." : progress < 60 ? "Extracting heatmap..." : progress < 85 ? "Detecting scenes..." : "Finalizing..."}
                </span>
              </div>
              <Progress
                value={progress}
                max={100}
                size="lg"
                variant={progress >= 90 ? "success" : "default"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {job && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {job.videoThumbnail && (
                  <img
                    src={job.videoThumbnail}
                    alt={job.videoTitle}
                    className="w-full sm:w-40 h-auto sm:h-22 object-cover rounded-lg"
                  />
                )}
                <div className="space-y-2 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    {job.videoTitle}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        job.status === JOB_STATUS.COMPLETED ? "default" : "secondary"
                      }
                      className="capitalize"
                    >
                      {job.status}
                    </Badge>
                    {job.videoDuration && (
                      <span className="text-sm font-mono text-muted-foreground">
                        {Math.floor(job.videoDuration / 60)}:
                        {(job.videoDuration % 60)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isCompleted && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-2/5 lg:sticky lg:top-4 lg:self-start">
                <Card className="overflow-hidden">
                  <VideoScenePreview
                    job={job}
                    selectedSceneIndex={selectedSceneIndex}
                    onSceneSelect={setSelectedSceneIndex}
                  />
                </Card>
              </div>

              <div className="lg:w-3/5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Detected Scenes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SceneEditor
                      heatmap={job.heatmapData ?? []}
                      suggestedScenes={job.scenes ?? []}
                      scenesLimit={user?.scenesLimit ?? 3}
                      onSceneSelect={setSelectedSceneIndex}
                      onScenesChange={setEditedScenes}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="flex justify-center">
              <Button asChild size="lg" className="rounded-full">
                <Link href={`/studio?jobId=${job.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Studio
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {!job && !isLoading && (
        <div className="text-center py-16 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto">
            <img
              src="/logo.svg"
              alt="Clutch"
              className="h-8 w-8 opacity-40"
            />
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
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<SkeletonDashboard className="container mx-auto p-4 sm:p-6" />}>
      <DashboardContent />
    </Suspense>
  );
}
