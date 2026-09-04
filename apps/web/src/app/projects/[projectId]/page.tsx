"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoBrowser } from "@/presentation/components/youtube/VideoBrowser";
import { SourceList } from "@/presentation/components/projects/SourceList";
import { SceneResults } from "@/presentation/components/scenes/SceneResults";
import { useProjectDetails } from "@/application/hooks/use-projects";
import { useYoutubeConnection } from "@/application/hooks/use-youtube-connection";
import { toastError, toastSuccess } from "@/lib/toast";

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { connected, channel } = useYoutubeConnection();
  const { data, loading, error, addSource, removeSource, generateScenes, refresh } = useProjectDetails(projectId);
  const [showBrowser, setShowBrowser] = useState(false);
  const [generatingSourceId, setGeneratingSourceId] = useState<string | null>(null);

  const handleGenerateScenes = async (sourceId: string) => {
    setGeneratingSourceId(sourceId);
    try {
      const result = await generateScenes(sourceId);
      if (result.status === "already_running") {
        toastError("Scene generation already in progress");
      } else if (result.status === "completed" && result.sceneCount && result.sceneCount > 0) {
        toastSuccess(`Generated ${result.sceneCount} scenes`);
      } else if (result.status === "error") {
        toastError(result.message ?? "No heatmap data available for this video");
      } else if (result.status === "timeout") {
        toastError(result.message ?? "Generation is taking longer than expected");
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to generate scenes");
    } finally {
      setGeneratingSourceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Project not found"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Dashboard
        </Button>
        <span className="truncate text-sm font-medium text-foreground/80">
          {data.project.name}
        </span>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{data.project.name}</h1>
            {data.project.description && (
              <p className="text-muted-foreground">{data.project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {connected && channel && (
              <span className="text-sm text-muted-foreground">
                {channel.title} ({channel.videoCount} videos)
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/editor`)}
            >
              Open Editor
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sources ({data.sources.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrowser(!showBrowser)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Video
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showBrowser && (
                <VideoBrowser
                  onAddVideo={async (videoId) => {
                    await addSource(videoId);
                  }}
                  showAddButton
                />
              )}
              <SourceList
                sources={data.sources}
                onRemove={(id) => removeSource(id)}
                onGenerateScenes={handleGenerateScenes}
                generatingSourceId={generatingSourceId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scenes ({data.scenes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <SceneResults
                scenes={data.scenes}
                onRefresh={refresh}
                onSelectScene={(scene) => {
                  const source = data.sources.find((s) => s.id === scene.sourceId);
                  if (source) {
                    router.push(`/projects/${projectId}/editor?sourceId=${source.id}`);
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
