"use client";

interface ClarificationCardProps {
  question: string;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function ClarificationCard({ question, suggestions, onSelect }: ClarificationCardProps) {
  return (
    <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
      <p className="text-sm">{question}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs rounded-full border bg-background hover:bg-muted transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
