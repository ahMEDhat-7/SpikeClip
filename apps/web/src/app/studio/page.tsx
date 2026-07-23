"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStudio } from "@/application/hooks/use-studio";
import { useExportClips } from "@/application/hooks/use-export-clips";
import { useJobApi } from "@/application/providers/api-provider";
import { Job, JOB_STATUS } from "@/domain/entities/job";
import { useAuth } from "@/application/hooks/use-auth";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { useBeforeUnload } from "@/lib/hooks/use-before-unload";
import { StudioLayout, ChatStudioLayout } from "@/presentation/components/studio/StudioLayout";
import { StudioToolbar } from "@/presentation/components/studio/StudioToolbar";
import { ToolPalette } from "@/presentation/components/studio/ToolPalette";
import { StudioTimeline } from "@/presentation/components/studio/StudioTimeline";
import { PlatformSelector } from "@/presentation/components/studio/PlatformSelector";
import { SceneSelector } from "@/presentation/components/studio/SceneSelector";
import { CaptionEditor } from "@/presentation/components/studio/CaptionEditor";
import { MusicPanel } from "@/presentation/components/studio/MusicPanel";
import { TemplateLibrary } from "@/presentation/components/studio/TemplateLibrary";
import { ExportPanel } from "@/presentation/components/studio/ExportPanel";
import { CompositePreview } from "@/presentation/components/studio/CompositePreview";
import { ChatPanel } from "@/presentation/components/studio/ChatPanel";
import { ActionList } from "@/presentation/components/studio/ActionList";
import { PreviewPanel } from "@/presentation/components/studio/PreviewPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Monitor, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toastError, toastSuccess } from "@/lib/toast";
import { OutputFormat, OutputQuality, DEFAULT_OUTPUT_FORMAT, DEFAULT_OUTPUT_QUALITY } from "@/domain/entities/export";

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const startTimeFromUrl = searchParams.get("start");
  const endTimeFromUrl = searchParams.get("end");
  const studio = useStudio();
  const jobApi = useJobApi();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [leftExpanded, setLeftExpanded] = useState(false);
  const isMobile = useIsMobile();

  const hasUnsavedEdits = studio.platform !== null || studio.scenes.length > 0 || studio.captions.length > 0 || studio.musicTrack !== null || studio.selectedTemplate !== null;
  useBeforeUnload(hasUnsavedEdits);

  const { clips, isExporting, exportClips, error: exportError } = useExportClips(job?.id ?? null);

  const initFromJobRef = useRef(studio.initFromJob);
  const goToStepRef = useRef(studio.goToStep);
  const addCustomSceneRef = useRef(studio.addCustomScene);
  const isAnalyzingRef = useRef(false);
  initFromJobRef.current = studio.initFromJob;
  goToStepRef.current = studio.goToStep;
  addCustomSceneRef.current = studio.addCustomScene;

  const loadJob = useCallback(async (id: string) => {
    setIsLoadingJob(true);
    try {
      const loaded = await jobApi.getJob(id);
      setJob(loaded);
      const start = startTimeFromUrl !== null ? parseFloat(startTimeFromUrl) : null;
      const end = endTimeFromUrl !== null ? parseFloat(endTimeFromUrl) : null;
      if (start !== null && end !== null && !isNaN(start) && !isNaN(end) && end > start) {
        addCustomSceneRef.current(start, end);
      } else {
        initFromJobRef.current(loaded.scenes ?? []);
        goToStepRef.current("scenes");
      }
    } catch {
      toastError("Failed to load job. Please check the URL and try again.");
    } finally {
      setIsLoadingJob(false);
    }
  }, [startTimeFromUrl, endTimeFromUrl]);

  useEffect(() => {
    if (jobIdFromUrl && !job) {
      loadJob(jobIdFromUrl);
    }
  }, [jobIdFromUrl, job, loadJob]);

  const pollJob = useCallback(async (jobId: string) => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const updated = await jobApi.getJob(jobId);
        if (updated.status === JOB_STATUS.COMPLETED || updated.status === JOB_STATUS.FAILED) {
          setJob(updated);
          if (updated.status === JOB_STATUS.COMPLETED) {
            initFromJobRef.current(updated.scenes ?? []);
            goToStepRef.current("scenes");
          }
          return;
        }
      } catch {
        if (i === maxAttempts - 1) {
          toastError("Lost connection while polling. Please refresh.");
        }
      }
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!urlInput.trim() || isAnalyzingRef.current) return;
    const url = urlInput.trim();
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toastError("Please enter a valid YouTube URL.");
      return;
    }
    isAnalyzingRef.current = true;
    setIsLoadingJob(true);
    try {
      const newJob = await jobApi.createJob(url);
      const processed = await jobApi.processJob(newJob.id);
      setJob(processed);
      if (processed.status === JOB_STATUS.COMPLETED) {
        initFromJobRef.current(processed.scenes ?? []);
        goToStepRef.current("scenes");
      } else {
        pollJob(processed.id);
      }
      } catch {
        toastError("Analysis failed. Please try again.");
      } finally {
        isAnalyzingRef.current = false;
        setIsLoadingJob(false);
      }
    }, [urlInput, pollJob]);

  const handleExport = useCallback(
    (outputConfig?: { format: string; quality: string }) => {
      if (!job || studio.selectedSceneIndex === null) return;
      const scene = studio.scenes[studio.selectedSceneIndex];
      if (!scene) return;

      const musicConfig = studio.musicTrack
        ? {
            fileKey: studio.musicTrack.id,
            volume: studio.musicTrack.volume,
            originalVolume: studio.originalVolume,
            fadeIn: studio.musicTrack.fadeIn,
            fadeOut: studio.musicTrack.fadeOut,
          }
        : undefined;

      exportClips(
        [{ start_time: scene.start_time, end_time: scene.end_time, peak_intensity: scene.peak_intensity }],
        {
          platform: studio.platform?.id,
          format: (outputConfig?.format ?? DEFAULT_OUTPUT_FORMAT) as OutputFormat,
          quality: (outputConfig?.quality ?? DEFAULT_OUTPUT_QUALITY) as OutputQuality,
          captions: studio.captions.length > 0
            ? studio.captions.map(({ text, font, size, color, position, textAlign, startFrame, endFrame, animation, textStyle, opacity, backgroundColor, backgroundEnabled, strokeWidth, shadowRadius, x, y }) => ({
                text, font, size, color, position, textAlign, startFrame, endFrame, animation, textStyle, opacity, backgroundColor, backgroundEnabled, strokeWidth, shadowRadius, x, y,
              }))
            : undefined,
          music: musicConfig,
          templateId: studio.selectedTemplate?.id,
          templateConfig: studio.selectedTemplate?.config as unknown as Record<string, unknown>,
          actions: studio.studioActions.length > 0 ? studio.studioActions : undefined,
        }
      );
      toastSuccess("Export started! Check the Export tab for progress.");
    },
    [job, studio, exportClips]
  );

  const renderCenter = () => {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {renderStepContent()}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (studio.currentStep) {
      case "platform":
        if (!job) {
          return (
            <div className="max-w-xl mx-auto space-y-4 py-6">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">Clip Studio</h1>
                <p className="text-sm text-muted-foreground">
                  Paste a YouTube URL to start creating your clip.
                </p>
              </div>

              <Card>
                <CardContent className="p-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAnalyze();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      disabled={isLoadingJob}
                      className="text-sm"
                    />
                    <Button type="submit" disabled={isLoadingJob || !urlInput.trim()} size="sm" className="h-9 px-3">
                      {isLoadingJob ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <PlatformSelector
                selected={studio.platform}
                onSelect={studio.setPlatform}
              />
            </div>
          );
        }

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setJob(null);
                  studio.reset();
                  setUrlInput("");
                }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Change Video
              </Button>
            </div>
            <PlatformSelector
              selected={studio.platform}
              onSelect={studio.setPlatform}
            />
          </div>
        );

      case "scenes":
        return (
          <SceneSelector
            scenes={studio.scenes}
            selectedSceneIndex={studio.selectedSceneIndex}
            onSelectScene={studio.selectScene}
            videoDuration={job?.videoDuration ?? 0}
            onCustomRange={studio.addCustomScene}
          />
        );

      case "chat":
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatPanel
              messages={studio.chatMessages}
              onSend={studio.sendChatMessage}
              loading={studio.chatLoading}
            />
          </div>
        );

      case "captions":
        return (
          <CaptionEditor
            captions={studio.captions}
            sceneCount={studio.scenes.length}
            onAdd={studio.addCaption}
            onUpdate={studio.updateCaption}
            onRemove={studio.removeCaption}
          />
        );

      case "music":
        return (
          <MusicPanel
            musicTrack={studio.musicTrack}
            originalVolume={studio.originalVolume}
            onSetMusic={studio.setMusic}
            onSetOriginalVolume={studio.setOriginalVolume}
            onUpload={(file) => jobApi.uploadMusic(file)}
            onDelete={(key) => jobApi.deleteMusic(key)}
          />
        );

      case "templates":
        return (
          <TemplateLibrary
            selectedTemplate={studio.selectedTemplate}
            onSelect={studio.selectTemplate}
          />
        );

      case "export":
        return (
          <ExportPanel
            platform={studio.platform}
            scenes={studio.scenes}
            selectedScenes={studio.selectedSceneIndex !== null ? [studio.selectedSceneIndex] : []}
            captions={studio.captions}
            musicTrack={studio.musicTrack}
            originalVolume={studio.originalVolume}
            selectedTemplate={studio.selectedTemplate}
            onExport={handleExport}
            isExporting={isExporting}
            clips={clips}
            exportError={exportError}
            initialFormat={studio.outputFormat}
            initialQuality={studio.outputQuality}
            onFormatChange={studio.setOutputFormat}
            onQualityChange={studio.setOutputQuality}
          />
        );

      default:
        return null;
    }
  };

  const renderRight = () => {
    if (!job) return null;
    
    if (studio.currentStep === "chat") {
      return (
        <div className="flex flex-col h-full">
          <PreviewPanel
            previewUrl={studio.previewUrl}
            loading={studio.previewLoading}
            error={studio.previewError}
            sceneStart={studio.selectedSceneIndex !== null ? studio.scenes[studio.selectedSceneIndex]?.start_time : 0}
            sceneEnd={studio.selectedSceneIndex !== null ? studio.scenes[studio.selectedSceneIndex]?.end_time : 15}
          />
          <ActionList
            actions={studio.studioActions}
            onRemove={studio.removeStudioAction}
          />
        </div>
      );
    }
    
    return (
      <CompositePreview
        job={job}
        platform={studio.platform}
        captions={studio.captions}
        selectedTemplate={studio.selectedTemplate}
        scenes={studio.scenes}
        selectedScenes={studio.selectedSceneIndex !== null ? [studio.selectedSceneIndex] : []}
        musicTrack={studio.musicTrack}
        onCaptionDrag={(id, x, y) => studio.updateCaption(id, { x, y })}
      />
    );
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
        <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Desktop Only</h1>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Clip Studio requires a larger screen to edit scenes, captions, and templates.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <StudioLayout
      leftExpanded={leftExpanded}
      toolbar={
        <StudioToolbar
          currentStep={studio.currentStep}
          currentStepIndex={studio.currentStepIndex}
          steps={studio.steps}
          canGoNext={studio.canGoNext}
          canGoPrev={studio.canGoPrev}
          isFirstStep={studio.isFirstStep}
          isLastStep={studio.isLastStep}
          onGoNext={studio.goNext}
          onGoPrev={studio.goPrev}
          onGoToStep={studio.goToStep}
          onExport={handleExport}
          onReset={studio.reset}
          isExporting={isExporting}
          outputFormat={studio.outputFormat}
          outputQuality={studio.outputQuality}
        />
      }
      left={
        <ToolPalette
          currentStep={studio.currentStep}
          onStepChange={studio.goToStep}
          expanded={leftExpanded}
          onToggleExpand={() => setLeftExpanded((p) => !p)}
          canGoToStep={studio.canGoToStep}
        />
      }
      center={renderCenter()}
      right={renderRight()}
      bottom={
        studio.scenes.length > 0 ? (
          <StudioTimeline
            scenes={studio.scenes}
            selectedScenes={studio.selectedSceneIndex !== null ? [studio.selectedSceneIndex] : []}
            totalDuration={job?.videoDuration ?? 0}
            onToggleScene={studio.selectScene}
          />
        ) : undefined
      }
    />
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <StudioContent />
    </Suspense>
  );
}
