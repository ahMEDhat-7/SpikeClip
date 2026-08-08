interface GlowOrbProps {
  className?: string;
  color?: string;
  size?: number;
  opacity?: number;
}

export function GlowOrb({
  className = "",
  color = "hsl(354, 79%, 59%)",
  size = 200,
  opacity = 0.1,
}: GlowOrbProps) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        animation: "pulse-glow 6s ease-in-out infinite",
      }}
      aria-hidden="true"
    />
  );
}
