interface DotsBackgroundProps {
  className?: string;
  opacity?: number;
}

export function DotsBackground({ className = "", opacity = 0.4 }: DotsBackgroundProps) {
  return (
    <div
      className={`absolute inset-0 dots-bg pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
