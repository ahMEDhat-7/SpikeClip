"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: Array<{ action: string; [key: string]: unknown }>;
  clarification?: {
    question: string;
    suggestions: string[];
  };
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onSuggestionClick,
  isLoading = false,
  disabled = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isLoading || disabled) return;
      onSendMessage(trimmed);
      setInput("");
    },
    [input, isLoading, disabled, onSendMessage]
  );

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Editor</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-3 opacity-50" />
            <p className="text-sm font-medium">Edit with natural language</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Describe what you want to change about this clip
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.actions.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] font-medium"
                    >
                      {a.action}
                    </span>
                  ))}
                </div>
              )}

              {msg.role === "assistant" && msg.clarification ? (
                <div>
                  <div className="flex items-start gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                    <p>{msg.clarification.question}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.clarification.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onSuggestionClick(s)}
                        disabled={disabled}
                        className="rounded-md bg-background/80 px-2 py-1 text-xs font-medium hover:bg-background transition-colors disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              <p className="text-[10px] mt-1 opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Add bold captions saying 'Highlight'..."
          disabled={disabled || isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || disabled || isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
