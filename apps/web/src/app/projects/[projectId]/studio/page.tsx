"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudioLayout } from "@/presentation/components/studio/StudioLayout";
import { useProjectDetails } from "@/application/hooks/use-projects";

interface SceneData {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  sourceId: string;
}

function StudioContent() {
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

    const foundScene = data.scenes.find((s: SceneData) => s.id === sceneId);
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
    <StudioLayout
      projectId={projectId}
      sceneId={sceneId!}
      jobId={projectId}
      sourceUrl={sourceUrl}
      platform={platform}
      sceneStart={scene.startTime}
      sceneEnd={scene.endTime}
      projectName={data.project.name}
    />
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
