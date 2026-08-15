"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OpenReelEditor } from "@/presentation/components/studio/OpenReelEditor";

const EDITOR_URL = process.env.NEXT_PUBLIC_OPENREEL_EDITOR_URL || "/openreel-editor/";

export default function StudioEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") || "";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const startNum = start !== null ? parseFloat(start) : NaN;
  const endNum = end !== null ? parseFloat(end) : NaN;

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OpenReelEditor jobId={jobId} start={startNum} end={endNum} />
    </Suspense>
  );
}