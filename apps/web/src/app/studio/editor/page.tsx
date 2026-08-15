"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { OpenReelEditor } from "@/presentation/components/studio/OpenReelEditor";
import { useJobApi } from "@/application/providers/api-provider";
import { useAuth } from "@/application/hooks/use-auth";

const EDITOR_URL = process.env.NEXT_PUBLIC_OPENREEL_EDITOR_URL || "/openreel-editor";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobApi = useJobApi();
  const { refreshUser } = useAuth();
  const jobId = searchParams.get("jobId") || "";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const platform = searchParams.get("platform") || "youtube-shorts";
  const startNum = start !== null ? parseFloat(start) : NaN;
  const endNum = end !== null ? parseFloat(end) : NaN;

  const [jobTitle, setJobTitle] = useState<string>("");
  const [showBack, setShowBack] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    jobApi.getJob(jobId).then((job) => {
      if (!cancelled && job.videoTitle) setJobTitle(job.videoTitle);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [jobId, jobApi]);

  const handleExportComplete = useCallback(() => {
    void refreshUser();
    try { localStorage.setItem("clip-exported", String(Date.now())); } catch {}
  }, [refreshUser]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Minimal header bar */}
      <div
        className="flex items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-sm"
        onMouseEnter={() => setShowBack(true)}
        onMouseLeave={() => setShowBack(true)}
      >
        <button
          onClick={() => router.push(`/studio?jobId=${jobId}`)}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground ${showBack ? "opacity-100" : "opacity-0 hover:opacity-100"}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Studio</span>
        </button>
        {jobTitle && (
          <span className="truncate text-sm font-medium text-foreground/80">{jobTitle}</span>
        )}
      </div>

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <OpenReelEditor
          jobId={jobId}
          start={startNum}
          end={endNum}
          platform={platform}
          onExportComplete={handleExportComplete}
        />
      </div>
    </div>
  );
}

export default function StudioEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
