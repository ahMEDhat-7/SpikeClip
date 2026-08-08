"use client";

import { useEffect, useRef } from "react";
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

const ORBIT_KEYFRAMES = [
  { transform: "translate(0, 0) rotate(0deg) scale(1)" },
  { transform: "translate(18px, -28px) rotate(12deg) scale(1.1)" },
  { transform: "translate(24px, -10px) rotate(-5deg) scale(1.05)" },
  { transform: "translate(8px, 18px) rotate(8deg) scale(1.08)" },
  { transform: "translate(-16px, 12px) rotate(-10deg) scale(1.12)" },
  { transform: "translate(-22px, -8px) rotate(6deg) scale(1.06)" },
  { transform: "translate(-10px, -22px) rotate(-8deg) scale(1.1)" },
  { transform: "translate(0, 0) rotate(0deg) scale(1)" },
];

export function FloatingIcon({
  icon,
  className = "",
  delay = 0,
  duration = 5,
}: FloatingIconProps) {
  const Icon = iconMap[icon];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = el.animate(ORBIT_KEYFRAMES, {
      duration: duration * 1000,
      delay: delay * 1000,
      iterations: Infinity,
      easing: "ease-in-out",
    });

    return () => animation.cancel();
  }, [duration, delay]);

  return (
    <div
      ref={ref}
      className={`absolute pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
        <Icon className="h-5 w-5 text-primary/60" />
      </div>
    </div>
  );
}
