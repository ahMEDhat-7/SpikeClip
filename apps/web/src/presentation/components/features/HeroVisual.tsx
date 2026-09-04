"use client";

import { ScrollReveal } from "@/presentation/components/features/ScrollReveal";

export function HeroVisual() {
  return (
    <ScrollReveal>
      <div className="relative mx-auto max-w-4xl mt-8">
        <div className="rounded-2xl border border-hairline bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline bg-surface/50">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 mx-4">
              <div className="rounded-lg bg-background/60 px-3 py-1 text-xs text-muted-foreground font-mono">
                spikeclip.app/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-6 space-y-4">
            {/* Top row: video info + stats */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">Analysis complete</span>
                </div>
                <h3 className="text-sm font-semibold">How to Build a SaaS App in 2024</h3>
                <p className="text-xs text-muted-foreground">12:34 duration · 1.2M views · 847K engagement score</p>
              </div>
              <div className="flex gap-3 text-right">
                <div>
                  <div className="text-lg font-mono font-bold text-primary">6</div>
                  <div className="text-[10px] text-muted-foreground">scenes</div>
                </div>
                <div>
                  <div className="text-lg font-mono font-bold text-accent">42s</div>
                  <div className="text-[10px] text-muted-foreground">total</div>
                </div>
              </div>
            </div>

            {/* Heatmap visualization */}
            <div className="rounded-xl bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Engagement Heatmap</span>
                <span className="text-[10px] text-muted-foreground font-mono">0:00 — 12:34</span>
              </div>
              <div className="flex gap-[2px] h-12 items-end">
                {Array.from({ length: 60 }, (_, i) => {
                  const pseudoRandom = Math.sin(i * 12345.6789) * 0.5 + 0.5;
                  const intensity = Math.sin(i * 0.3) * 0.4 + pseudoRandom * 0.3 + 0.3;
                  const isHighlighted = (i >= 12 && i <= 18) || (i >= 35 && i <= 42) || (i >= 50 && i <= 56);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${intensity * 100}%`,
                        backgroundColor: isHighlighted
                          ? "hsl(350 80% 55%)"
                          : `hsl(350 80% ${55 + intensity * 20}%)`,
                        opacity: isHighlighted ? 1 : 0.4 + intensity * 0.3,
                      }}
                    />
                  );
                })}
              </div>
              {/* Scene markers */}
              <div className="flex gap-2">
                {[
                  { label: "Scene 1", time: "1:12–1:48", score: "0.92" },
                  { label: "Scene 2", time: "3:30–4:12", score: "0.87" },
                  { label: "Scene 3", time: "5:00–5:42", score: "0.84" },
                ].map((scene) => (
                  <div
                    key={scene.label}
                    className="flex-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-primary">{scene.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{scene.score}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{scene.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scene cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { title: "Intro hook", duration: "36s", platform: "Shorts", color: "bg-timeline-thinking" },
                { title: "Key insight", duration: "42s", platform: "TikTok", color: "bg-timeline-read" },
                { title: "Call to action", duration: "28s", platform: "Reels", color: "bg-timeline-edit" },
              ].map((clip) => (
                <div
                  key={clip.title}
                  className="rounded-xl border border-hairline bg-surface/50 p-3 space-y-2"
                >
                  <div className={`h-16 rounded-lg ${clip.color}/20 flex items-center justify-center`}>
                    <svg className="h-6 w-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium">{clip.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">{clip.duration}</span>
                      <span className="text-[10px] text-muted-foreground">{clip.platform}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
