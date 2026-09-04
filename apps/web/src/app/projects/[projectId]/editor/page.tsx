"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SceneResults } from "@/presentation/components/scenes/SceneResults";
import { ScenePreview } from "@/presentation/components/scenes/ScenePreview";
import { SceneAdjuster } from "@/presentation/components/scenes/SceneAdjuster";
import { SourceList } from "@/presentation/components/projects/SourceList";
import { useProjectDetails } from "@/application/hooks/use-projects";
import { toastError, toastSuccess } from "@/lib/toast";

function ProjectEditorContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const sourceId = searchParams.get("sourceId") || "";

  const { data, loading, error, addSource, removeSource, generateScenes, updateScene, refresh } = useProjectDetails(projectId);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [generatingSourceId, setGeneratingSourceId] = useState<string | null>(null);

  const selectedScene = data?.scenes.find((s) => s.id === selectedSceneId);
  const source = data?.sources.find((s) => s.id === sourceId);

  const handleGenerateScenes = async (sid: string) => {
    setGeneratingSourceId(sid);
    try {
      const result = await generateScenes(sid);
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
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Project
        </Button>
        <span className="truncate text-sm font-medium text-foreground/80">
          {data.project.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {selectedScene && source ? (
            <ScenePreview
              videoId={source.youtubeVideoId}
              startTime={selectedScene.startTime}
              endTime={selectedScene.endTime}
              duration={selectedScene.duration}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">Select a scene to preview</p>
              </CardContent>
            </Card>
          )}

          {selectedScene && (
            <SceneAdjuster
              sceneId={selectedScene.id}
              startTime={selectedScene.startTime}
              endTime={selectedScene.endTime}
              duration={selectedScene.duration}
              onSave={async (data) => {
                await updateScene(selectedScene.id, {
                  startTime: data.startTime,
                  endTime: data.endTime,
                });
              }}
            />
          )}
        </div>

        <div className="space-y-6">
          <SourceList
            sources={data.sources}
            compact
            onRemove={(id) => removeSource(id)}
            onGenerateScenes={handleGenerateScenes}
            generatingSourceId={generatingSourceId}
          />

          <SceneResults
            scenes={data.scenes}
            onSelectScene={(scene) => setSelectedSceneId(scene.id)}
            onRefresh={refresh}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProjectEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProjectEditorContent />
    </Suspense>
  );
}
