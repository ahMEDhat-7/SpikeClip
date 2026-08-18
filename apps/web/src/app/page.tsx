import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { ScrollReveal } from "@/presentation/components/features/ScrollReveal";
import { HeroVisual } from "@/presentation/components/features/HeroVisual";
import { SocialProofBar } from "@/presentation/components/features/SocialProofBar";
import { ProblemSection } from "@/presentation/components/features/ProblemSection";
import { FAQ } from "@/presentation/components/features/FAQ";
import { ArrowRight, Sparkles, BarChart3, Layers, Download, Link2, Scan, MousePointer } from "lucide-react";
import { LANDING_FEATURES } from "@/presentation/constants/features";

const stats = [
  { value: "3-60s", label: "Clip duration range", color: "text-primary" },
  { value: "9:16", label: "Vertical format", color: "text-accent" },
  { value: "<10s", label: "Analysis time", color: "text-primary" },
  { value: "99.9%", label: "Uptime", color: "text-accent" },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero Section — Real product UI */}
      <section className="relative overflow-hidden min-h-[85vh] flex flex-col">
        <DotsBackground opacity={0.7} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10 flex-1 flex flex-col justify-center pb-12">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto mb-4">
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
            <p className="text-xs text-muted-foreground">
              Free tier · No credit card required
            </p>
          </div>

          {/* Hero Visual — Real product UI */}
          <HeroVisual />
        </div>
      </section>

      {/* Social Proof Bar — Integration logos */}
      <SocialProofBar />

      {/* Problem Framing — PAS */}
      <ScrollReveal>
        <ProblemSection />
      </ScrollReveal>

      {/* Stats Bar */}
      <ScrollReveal>
        <section className="relative border-y border-hairline bg-background py-12">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-hairline" aria-label="Key statistics">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center px-4">
                  <div className={`text-3xl font-mono font-semibold ${stat.color}`}>
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

      {/* How it Works — With visual connectors */}
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
                { num: "01", icon: Link2, title: "Paste your URL", desc: "Drop in any YouTube video link. We validate and extract heatmap data automatically." },
                { num: "02", icon: BarChart3, title: "Extract heatmap", desc: "Per-second viewer engagement scores are pulled directly from YouTube's heatmap API." },
                { num: "03", icon: Scan, title: "Detect scenes", desc: "The spike merging algorithm clusters high-engagement moments into scored, naturally-bounded clips." },
                { num: "04", icon: MousePointer, title: "Pick your scenes", desc: "Review detected scenes ranked by engagement score. Select the moments that fit your content." },
                { num: "05", icon: Sparkles, title: "Edit with AI", desc: "OpenReel-powered editor with AI video generation — captions, effects, transitions, and more via natural language." },
                { num: "06", icon: Download, title: "Export vertical clips", desc: "Download 9:16 clips ready for TikTok, YouTube Shorts, and Instagram Reels." },
              ].map((step, i) => (
                <Card key={step.num} className="relative rounded-none border-0 border-hairline bg-transparent group transition-colors hover:bg-surface/50">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="text-3xl font-mono font-bold text-primary/40">
                      {step.num}
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </CardContent>
                  {/* Visual connector arrow — only between cards in the same row */}
                  {i < 5 && i % 3 !== 2 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 items-center justify-center">
                      <div className="h-6 w-6 rounded-full bg-background border border-hairline flex items-center justify-center">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Why SpikeClip — Bento grid layout */}
      <ScrollReveal>
        <section className="relative bg-background border-t border-hairline py-section">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12">
              <p
                className="text-[11px] font-semibold uppercase text-muted-foreground mb-3"
                style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}
              >
                Why SpikeClip
              </p>
              <h2
                className="text-2xl sm:text-3xl font-semibold"
                style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
              >
                Built for creators who value data over guesswork
              </h2>
            </div>
            <div className="bento-grid max-w-5xl mx-auto">
              {/* Primary differentiator — spans 2 columns */}
              <Card className="bento-featured group transition-all duration-300 hover:shadow-md border-hairline bg-card rounded-2xl">
                <CardContent className="p-6 h-full flex flex-col space-y-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-primary shrink-0"
                    style={{
                      background: `color-mix(in srgb, var(--color-primary) 10%, transparent)`,
                      animation: `icon-orbit 4s ease-in-out 0s infinite`,
                    }}
                  >
                    {(() => {
                      const Icon = LANDING_FEATURES[0].icon;
                      return <Icon className="h-5 w-5" aria-hidden="true" />;
                    })()}
                  </div>
                  <h3 className="font-semibold text-lg">{LANDING_FEATURES[0].title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {LANDING_FEATURES[0].description}
                  </p>
                </CardContent>
              </Card>

              {/* Supporting features */}
              {LANDING_FEATURES.slice(1).map((feature, i) => (
                <Card
                  key={feature.title}
                  className="group transition-all duration-300 hover:shadow-md border-hairline bg-card rounded-2xl"
                >
                  <CardContent className="p-6 h-full flex flex-col space-y-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-primary shrink-0"
                      style={{
                        background: `color-mix(in srgb, var(--color-primary) 10%, transparent)`,
                        animation: `icon-orbit ${4 + (i + 1) * 0.5}s ease-in-out ${(i + 1) * 0.6}s infinite`,
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
                  Full Pipeline
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-semibold leading-tight"
                  style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
                >
                  From URL to clips{" "}
                  <span className="gradient-text">in four steps</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  The complete workflow — analyze viewer engagement, pick the best
                  moments, polish with AI, and export vertical clips ready to post.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: BarChart3, num: "01", title: "Analyze", desc: "Paste a URL and get heatmap data with per-second engagement scores." },
                    { icon: Layers, num: "02", title: "Select", desc: "Review detected scenes ranked by viewer rewatch intensity." },
                    { icon: Sparkles, num: "03", title: "Edit", desc: "Add captions, music, effects, and templates with AI assistance." },
                    { icon: Download, num: "04", title: "Export", desc: "Download vertical clips ready for TikTok, Shorts, and Reels." },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          <span className="text-muted-foreground font-mono text-xs mr-1.5">{step.num}</span>
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
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
                      Clip Studio Pipeline
                    </div>
                    {[
                      { stage: "01", label: "Analyze", desc: "Heatmap extracted — 6 scenes detected", color: "bg-primary/10 text-primary", barColor: "bg-timeline-thinking" },
                      { stage: "02", label: "Select", desc: "3 scenes selected (42s total)", color: "bg-primary/10 text-primary", barColor: "bg-timeline-read" },
                      { stage: "03", label: "Edit", desc: "Captions + music applied", color: "bg-accent/10 text-accent", barColor: "bg-timeline-edit" },
                      { stage: "04", label: "Export", desc: "Rendering 9:16 vertical clips", color: "bg-accent/10 text-accent", barColor: "bg-timeline-done" },
                    ].map((item) => (
                      <div key={item.stage} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-bold ${item.color}`}>
                          {item.stage}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{item.desc}</span>
                          </div>
                          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${item.barColor}`} style={{ width: item.stage === "04" ? "75%" : "100%" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-1.5 mt-3">
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-thinking" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-read" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-edit" />
                      <div className="h-1.5 flex-1 rounded-full bg-timeline-done" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ Section */}
      <ScrollReveal>
        <FAQ />
      </ScrollReveal>

      {/* Final CTA Section — Outcome restatement */}
      <ScrollReveal>
        <section className="relative py-section text-center">
          <div className="glow-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10 space-y-6">
            <h2
              className="text-2xl sm:text-3xl font-semibold"
              style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
            >
              Find what viewers actually rewatch — start free
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Free tier includes 3 analyses per month. No credit card required.
            </p>
            <div className="flex justify-center">
              <Button asChild className="group rounded-full px-8 h-12 text-sm font-semibold gradient-border-btn">
                <Link href="/login">
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}
