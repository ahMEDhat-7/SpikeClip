"use client";

import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage, ChatMessageData, TypingIndicator } from "./ChatMessage";
import type { ChatLoadingPhase, PendingClarification, PendingPreview } from "@/application/hooks/use-studio";

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSend: (message: string) => void;
  loadingPhase?: ChatLoadingPhase;
  pendingClarification?: PendingClarification | null;
  onClarificationSelect?: (suggestion: string) => void;
  pendingPreview?: PendingPreview | null;
  onApplyPreview?: (actions: PendingPreview["actions"]) => void;
  onCancelPreview?: () => void;
}

export function ChatPanel({
  messages,
  onSend,
  loadingPhase,
  pendingClarification,
  onClarificationSelect,
  pendingPreview,
  onApplyPreview,
  onCancelPreview,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingPhase, pendingClarification, pendingPreview]);

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Edit with prompts</h3>
        <p className="text-xs text-muted-foreground">Describe what you want to change</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && !pendingClarification && !pendingPreview && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p>Try prompts like:</p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => onSend("Add bold white captions saying 'Highlight Moment' from 0-3s")}
                className="block w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs transition-colors"
              >
                &quot;Add bold white captions saying &apos;Highlight Moment&apos; from 0-3s&quot;
              </button>
              <button
                onClick={() => onSend("Make it 2x speed with a vignette effect")}
                className="block w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs transition-colors"
              >
                &quot;Make it 2x speed with a vignette effect&quot;
              </button>
              <button
                onClick={() => onSend("Mix in background music at 30% volume with 2s fade in")}
                className="block w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs transition-colors"
              >
                &quot;Mix in background music at 30% volume with 2s fade in&quot;
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {pendingClarification && pendingClarification.suggestions.length > 0 && (
          <div className="mt-2 p-3 rounded-lg bg-muted/40 border border-dashed">
            <p className="text-xs text-muted-foreground mb-2">Choose an option:</p>
            <div className="flex flex-wrap gap-2">
              {pendingClarification.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onClarificationSelect?.(s)}
                  className="px-2.5 py-1 text-xs rounded-full bg-background border hover:bg-muted/70 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {pendingPreview && (
          <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs font-medium mb-1">Preview changes</p>
            <p className="text-xs text-muted-foreground mb-3">{pendingPreview.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onApplyPreview?.(pendingPreview.actions)}
                className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => onCancelPreview?.()}
                className="px-3 py-1 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loadingPhase && <TypingIndicator phase={loadingPhase} />}
      </div>

      <ChatInput onSend={onSend} disabled={!!loadingPhase} />
    </div>
  );
}
