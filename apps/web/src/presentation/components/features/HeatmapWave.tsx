"use client";

interface HeatmapWaveProps {
  className?: string;
}

export function HeatmapWave({ className = "" }: HeatmapWaveProps) {
  return (
    <svg
      viewBox="0 0 800 240"
      className={`w-full h-auto ${className}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#E63946" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#E63946" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="waveStroke" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E63946" stopOpacity="1" />
        </linearGradient>
        <filter id="waveGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Baseline */}
      <line
        x1="0"
        y1="220"
        x2="800"
        y2="220"
        stroke="#3f3f46"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Fill area */}
      <path
        d="M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220 L800 240 L0 240 Z"
        fill="url(#waveGrad)"
      >
        <animate
          attributeName="d"
          values="
            M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220 L800 240 L0 240 Z;
            M0 220 Q100 215 200 210 Q300 195 400 180 Q500 165 600 180 Q700 195 800 215 L800 240 L0 240 Z;
            M0 220 Q100 210 200 195 Q300 170 400 140 Q500 110 600 140 Q700 170 800 210 L800 240 L0 240 Z;
            M0 220 Q100 200 200 175 Q300 140 400 100 Q500 70 600 100 Q700 140 800 200 L800 240 L0 240 Z;
            M0 220 Q100 185 200 150 Q300 110 400 70 Q500 40 600 70 Q700 110 800 185 L800 240 L0 240 Z;
            M0 220 Q100 200 200 175 Q300 140 400 100 Q500 70 600 100 Q700 140 800 200 L800 240 L0 240 Z;
            M0 220 Q100 210 200 195 Q300 170 400 140 Q500 110 600 140 Q700 170 800 210 L800 240 L0 240 Z;
            M0 220 Q100 215 200 210 Q300 195 400 180 Q500 165 600 180 Q700 195 800 215 L800 240 L0 240 Z;
            M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220 L800 240 L0 240 Z"
          dur="10s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
        />
      </path>

      {/* Stroke line */}
      <path
        d="M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220"
        fill="none"
        stroke="url(#waveStroke)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#waveGlow)"
      >
        <animate
          attributeName="d"
          values="
            M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220;
            M0 220 Q100 215 200 210 Q300 195 400 180 Q500 165 600 180 Q700 195 800 215;
            M0 220 Q100 210 200 195 Q300 170 400 140 Q500 110 600 140 Q700 170 800 210;
            M0 220 Q100 200 200 175 Q300 140 400 100 Q500 70 600 100 Q700 140 800 200;
            M0 220 Q100 185 200 150 Q300 110 400 70 Q500 40 600 70 Q700 110 800 185;
            M0 220 Q100 200 200 175 Q300 140 400 100 Q500 70 600 100 Q700 140 800 200;
            M0 220 Q100 210 200 195 Q300 170 400 140 Q500 110 600 140 Q700 170 800 210;
            M0 220 Q100 215 200 210 Q300 195 400 180 Q500 165 600 180 Q700 195 800 215;
            M0 220 Q100 220 200 220 Q300 220 400 220 Q500 220 600 220 Q700 220 800 220"
          dur="10s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
        />
      </path>
    </svg>
  );
}
