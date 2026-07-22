"use client";

import { ReactNode } from "react";

interface StudioLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  toolbar: ReactNode;
  leftExpanded?: boolean;
}

export function StudioLayout({ left, center, right, bottom, toolbar, leftExpanded }: StudioLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {toolbar}

      <div className="flex flex-1 overflow-hidden">
        <aside
          role="navigation"
          aria-label="Studio tools"
          className={`shrink-0 border-r bg-background overflow-hidden transition-all duration-200 ${
            leftExpanded ? "w-48" : "w-14"
          }`}
        >
          {left}
        </aside>

        <main role="main" className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full">
            {center}
          </div>

          {right && (
            <aside
              role="complementary"
              aria-label="Preview"
              className="w-[420px] shrink-0 border-l bg-background overflow-y-auto hidden md:block"
            >
              {right}
            </aside>
          )}
        </main>
      </div>

      {bottom && <div className="shrink-0 border-t bg-background">{bottom}</div>}
    </div>
  );
}

interface ChatStudioLayoutProps {
  sceneSelector: ReactNode;
  chatPanel: ReactNode;
  previewPanel: ReactNode;
  toolbar: ReactNode;
  actionList?: ReactNode;
}

export function ChatStudioLayout({ sceneSelector, chatPanel, previewPanel, toolbar, actionList }: ChatStudioLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {toolbar}

      <div className="flex flex-1 overflow-hidden">
        <aside
          role="navigation"
          aria-label="Scene selector"
          className="w-64 shrink-0 border-r bg-background overflow-y-auto hidden lg:block"
        >
          {sceneSelector}
        </aside>

        <main role="main" className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 h-full">
            <div className="flex-1 overflow-y-auto">
              {chatPanel}
            </div>
            {actionList}
          </div>

          <aside
            role="complementary"
            aria-label="Preview"
            className="w-[420px] shrink-0 border-l bg-background overflow-y-auto hidden md:block"
          >
            {previewPanel}
          </aside>
        </main>
      </div>
    </div>
  );
}
