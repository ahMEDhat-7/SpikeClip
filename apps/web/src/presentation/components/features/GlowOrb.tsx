interface GlowOrbProps {
  className?: string;
  color?: string;
  size?: number;
}

export function GlowOrb({
  className = "",
  color = "hsl(354, 79%, 59%)",
  size = 200,
}: GlowOrbProps) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: 0.15,
        animation: "pulse-glow 4s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );
}
