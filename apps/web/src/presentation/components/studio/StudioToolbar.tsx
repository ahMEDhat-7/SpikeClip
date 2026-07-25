"use client";

import { memo, useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { StudioStep } from "@/domain/entities/studio";
import { STEP_LABELS } from "@/presentation/constants/studio";
import { OutputFormat, OutputQuality, DEFAULT_OUTPUT_FORMAT, DEFAULT_OUTPUT_QUALITY } from "@/domain/entities/export";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";

interface StudioToolbarProps {
  currentStep: StudioStep;
  currentStepIndex: number;
  steps: StudioStep[];
  canGoNext: boolean;
  canGoPrev: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onGoNext: () => void;
  onGoPrev: () => void;
  onGoToStep: (step: StudioStep) => void;
  onExport: (config?: { format: OutputFormat; quality: OutputQuality }) => void;
  onReset: () => void;
  isExporting?: boolean;
  outputFormat?: OutputFormat;
  outputQuality?: OutputQuality;
}

export const StudioToolbar = memo(function StudioToolbar({
  currentStep,
  currentStepIndex,
  steps,
  canGoNext,
  canGoPrev,
  isFirstStep,
  isLastStep,
  onGoNext,
  onGoPrev,
  onGoToStep,
  onExport,
  onReset,
  isExporting,
  outputFormat = DEFAULT_OUTPUT_FORMAT,
  outputQuality = DEFAULT_OUTPUT_QUALITY,
}: StudioToolbarProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="h-3 w-px bg-border" />
        {showResetConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Reset?</span>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => { onReset(); setShowResetConfirm(false); }}
            >
              Yes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowResetConfirm(false)}
            >
              No
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(true)} className="h-7 px-2 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIndex;
          const isCompleted = i < currentStepIndex;
          return (
            <div key={step} className="flex items-center">
              <button
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium transition-all ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : isCompleted
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => onGoToStep(step)}
                title={STEP_LABELS[step]}
                aria-label={STEP_LABELS[step]}
              >
                {i + 1}
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`w-2.5 h-0.5 mx-0.5 ${
                    i < currentStepIndex ? "bg-primary/40" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
        <span className="text-xs font-medium text-muted-foreground ml-1 hidden sm:inline">
          {STEP_LABELS[currentStep]}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onGoPrev} disabled={!canGoPrev} className="h-7 px-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-7 w-7"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        )}

        {isLastStep ? (
          <Button
            size="sm"
            onClick={() => onExport({ format: outputFormat, quality: outputQuality })}
            disabled={isExporting}
            className="h-7 px-3 text-xs bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        ) : (
          <Button size="sm" onClick={onGoNext} disabled={!canGoNext} className="h-7 px-2.5 text-xs">
            Next
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
});
