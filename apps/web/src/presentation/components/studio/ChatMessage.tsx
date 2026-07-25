"use client";

import { Loader2 } from "lucide-react";
import type { ChatLoadingPhase } from "@/application/hooks/use-studio";

export interface ChatMessageData {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-muted-foreground rounded-bl-md"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

const PHASE_LABELS: Record<NonNullable<ChatLoadingPhase>, string> = {
  analyzing: "Analyzing your prompt",
  generating: "Generating preview",
};

export function TypingIndicator({ phase }: { phase?: ChatLoadingPhase }) {
  const label = phase ? PHASE_LABELS[phase] : "Thinking";

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-muted text-muted-foreground px-4 py-2 rounded-2xl rounded-bl-md flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">{label}</span>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
