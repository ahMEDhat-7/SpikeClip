import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlignmentGridHero } from "@/presentation/components/features/AlignmentGridHero";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { ScrollReveal } from "@/presentation/components/features/ScrollReveal";
import { ArrowRight, Code, MessageSquare, Eye, Sparkles } from "lucide-react";
import { LANDING_FEATURES } from "@/presentation/constants/features";

const stats = [
  { value: "3-60s", label: "Clip duration range" },
  { value: "9:16", label: "Vertical format" },
  { value: "<10s", label: "Analysis time" },
  { value: "99.9%", label: "Uptime" },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero Section — Alignment Grid with Spring Physics */}
      <section className="relative overflow-hidden min-h-[85vh] flex flex-col">
        <DotsBackground opacity={0.7} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10 flex-1 flex flex-col justify-center pt-24 pb-12">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto mb-8">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]"
              style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
            >
              Find what viewers{" "}
              <span className="gradient-text">actually rewatch</span>
            </h1>
            <p
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
              style={{ letterSpacing: "var(--tracking-body, -0.01em)" }}
            >
              Real viewer data shows which moments your audience rewatched —
              extract the best clips and reformat for every platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button asChild className="group rounded-full px-8 h-12 text-sm font-semibold gradient-border-btn">
                <Link href="/login">
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline-hairline" className="rounded-full px-8 h-12 text-sm">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>

          {/* Alignment Grid Demo — Spring Physics */}
          <ScrollReveal>
            <AlignmentGridHero />
          </ScrollReveal>
        </div>
      </section>

      {/* Stats Bar */}
      <ScrollReveal>
        <section className="relative border-y border-hairline bg-background py-12">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-hairline" aria-label="Key statistics">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center px-4">
                  <div className="text-3xl font-mono font-semibold gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* How it Works — Bento grid with grid-section borders */}
      <ScrollReveal>
        <section id="how-it-works" className="relative py-section scroll-mt-20">
          <DotsBackground opacity={0.7} />
          <div className="relative z-10 container mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground mb-3"
                style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}
              >
                Workflow
              </p>
              <h2
                className="text-2xl sm:text-3xl font-semibold"
                style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
              >
                How it works
              </h2>
              <p className="text-muted-foreground mt-3 text-lg">
                From URL to clips in under 60 seconds
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-5xl mx-auto grid-section">
              {[
                { num: "01", title: "Paste your URL", desc: "Drop in any YouTube video link. We validate and extract heatmap data automatically." },
                { num: "02", title: "See the heatmap", desc: "View exactly where viewers rewatched. Our algorithm identifies the top moments." },
                { num: "03", title: "Export clips", desc: "Select scenes and download vertical clips ready for TikTok, Shorts, or Reels." },
              ].map((step) => (
                <Card key={step.num} className="rounded-none border-0 border-hairline bg-transparent group transition-colors hover:bg-surface/50">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="text-4xl font-mono font-bold text-primary/40">
                      {step.num}
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Why Clutch — Asymmetric bento layout */}
      <ScrollReveal>
        <section className="relative bg-background border-t border-hairline py-section">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12">
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground mb-3"
                style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}
              >
                Why Clutch
              </p>
              <h2
                className="text-2xl sm:text-3xl font-semibold"
                style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
              >
                Built for creators who value data over guesswork
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {LANDING_FEATURES.map((feature, i) => (
                <Card
                  key={feature.title}
                  className="group transition-all duration-300 hover:shadow-md border-hairline bg-card rounded-2xl"
                >
                  <CardContent className="p-6 h-full flex flex-col space-y-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-primary shrink-0"
                      style={{
                        background: `color-mix(in srgb, var(--color-primary) 10%, transparent)`,
                        animation: `icon-orbit ${4 + i * 0.5}s ease-in-out ${i * 0.6}s infinite`,
                      }}
                    >
                      <feature.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Clip Studio — Editorial layout */}
      <ScrollReveal>
        <section className="relative py-section overflow-hidden">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  <Sparkles className="h-3 w-3" />
                  AI-Powered Editing
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold leading-tight"
                  style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
                >
                  Edit clips with{" "}
                  <span className="gradient-text">natural language</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Type what you want in plain English. Our AI translates your prompt into
                  professional video edits — captions, effects, transitions, speed changes,
                  and more.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">Prompt-based workflow</h3>
                      <p className="text-sm text-muted-foreground">
                        &quot;Add bold captions centered on screen&quot; or &quot;Speed up the intro by 2x&quot;
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">Live preview</h3>
                      <p className="text-sm text-muted-foreground">
                        See every change in real-time before exporting
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Code className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">8 action types</h3>
                      <p className="text-sm text-muted-foreground">
                        Captions, effects, overlays, transitions, speed, audio mixing, backgrounds, and trims
                      </p>
                    </div>
                  </div>
                </div>
                <Button asChild className="group mt-4 rounded-full px-6">
                  <Link href="/login">
                    Try Clip Studio
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
              {/* Studio mockup card */}
              <div className="relative" aria-hidden="true">
                <div className="rounded-2xl border border-hairline bg-card/80 backdrop-blur-sm p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                      Clip Studio
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 font-mono text-xs">
                      <span className="text-primary">You:</span> Add bold captions centered on screen
                    </div>
                    <div className="rounded-xl bg-primary/5 p-3 font-mono text-xs border border-primary/10">
                      <span className="text-primary font-medium">Studio:</span> Applied 1 action: add_captions
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 font-mono text-xs">
                      <span className="text-primary">You:</span> Speed up the intro by 2x
                    </div>
                    <div className="rounded-xl bg-primary/5 p-3 font-mono text-xs border border-primary/10">
                      <span className="text-primary font-medium">Studio:</span> Applied 1 action: set_speed
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 font-mono text-xs">
                      <span className="text-primary">You:</span> Make it black and white with a vignette
                    </div>
                    <div className="rounded-xl bg-primary/5 p-3 font-mono text-xs border border-primary/10">
                      <span className="text-primary font-medium">Studio:</span> Applied 2 actions: apply_effect x2
                    </div>
                    {/* Timeline progress bars */}
                    <div className="flex gap-1.5 mt-3">
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-thinking" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-read" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-edit" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-grep" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-done" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA Section */}
      <ScrollReveal>
        <section className="relative py-section text-center">
          <div className="glow-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10 space-y-6">
            <h2
              className="text-2xl sm:text-3xl font-semibold"
              style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
            >
              Start clipping with real data
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Free tier includes 3 analyses per month. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="group rounded-full px-8 h-12 text-sm font-semibold gradient-border-btn">
                <Link href="/login">
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline-hairline" className="rounded-full px-8 h-12 text-sm">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
