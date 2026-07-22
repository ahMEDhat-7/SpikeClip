"use client";

import { Film, Scissors, Play } from "lucide-react";

interface FloatingIconProps {
  icon: "film" | "scissors" | "play";
  className?: string;
  delay?: number;
  duration?: number;
}

const iconMap = {
  film: Film,
  scissors: Scissors,
  play: Play,
};

export function FloatingIcon({
  icon,
  className = "",
  delay = 0,
  duration = 5,
}: FloatingIconProps) {
  const Icon = iconMap[icon];

  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
        <Icon className="h-5 w-5 text-primary/60" />
      </div>
    </div>
  );
}
