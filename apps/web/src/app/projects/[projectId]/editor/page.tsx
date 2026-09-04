"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenReelEditor } from "@/presentation/components/studio/OpenReelEditor";
import { useProjectDetails } from "@/application/hooks/use-projects";

interface SceneData {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  sourceId: string;
}

function ProjectEditorContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const sceneId = searchParams.get("sceneId");
  const platform = searchParams.get("platform") || "youtube-shorts";

  const { data, loading, error } = useProjectDetails(projectId);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneData | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !sceneId) return;

    const foundScene = data.scenes.find((s) => s.id === sceneId);
    if (!foundScene) {
      setPrepareError("Scene not found");
      setPreparing(false);
      return;
    }

    setScene(foundScene);

    const prepareSource = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/clips/editor-source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sourceId: foundScene.sourceId,
            startTime: foundScene.startTime,
            endTime: foundScene.endTime,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Failed to prepare source (${res.status})`);
        }

        const result = (await res.json()) as { url: string };
        setSourceUrl(result.url);
      } catch (err) {
        setPrepareError(err instanceof Error ? err.message : "Failed to prepare source");
      } finally {
        setPreparing(false);
      }
    };

    prepareSource();
  }, [data, sceneId, projectId]);

  if (loading || preparing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {preparing ? "Preparing source video..." : "Loading project..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Project not found"}</p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  if (prepareError || !scene || !sourceUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{prepareError ?? "Could not prepare source video"}</p>
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
          Back to Project
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-sm">
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
      </header>
      <div className="flex-1 overflow-hidden">
        <OpenReelEditor
          sourceUrl={sourceUrl}
          exportUrl={`/api/projects/${projectId}/clips/editor-export`}
          start={scene.startTime}
          end={scene.endTime}
          platform={platform}
          onExportComplete={() => router.push(`/projects/${projectId}`)}
        />
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
