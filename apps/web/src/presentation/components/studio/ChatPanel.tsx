"use client";

import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage, ChatMessageData, TypingIndicator } from "./ChatMessage";
import type { ChatLoadingPhase } from "@/application/hooks/use-studio";

interface ChatPanelProps {
  messages: ChatMessageData[];
  onSend: (message: string) => void;
  loadingPhase?: ChatLoadingPhase;
}

export function ChatPanel({ messages, onSend, loadingPhase }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingPhase]);

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Edit with prompts</h3>
        <p className="text-xs text-muted-foreground">Describe what you want to change</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
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

        {loadingPhase && <TypingIndicator phase={loadingPhase} />}
      </div>

      <ChatInput onSend={onSend} disabled={!!loadingPhase} />
    </div>
  );
}
