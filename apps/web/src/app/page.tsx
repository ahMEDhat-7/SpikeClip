import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedHeatmapHero } from "@/presentation/components/features/AnimatedHeatmapHero";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { FloatingIcon } from "@/presentation/components/features/FloatingIcon";
import { GlowOrb } from "@/presentation/components/features/GlowOrb";
import { HeatmapWave } from "@/presentation/components/features/HeatmapWave";
import { ArrowRight, Code } from "lucide-react";
import { LANDING_FEATURES } from "@/presentation/constants/features";

const stats = [
  { value: "3-60s", label: "Clip duration range" },
  { value: "9:16", label: "Vertical format" },
  { value: "<10s", label: "Analysis time" },
  { value: "99.9%", label: "Uptime" },
];

export default function HomePage() {
  return (
    <main className="space-y-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <DotsBackground opacity={0.3} />

        {/* Glow orbs */}
        <GlowOrb className="top-20 left-1/4" size={300} />
        <GlowOrb className="bottom-20 right-1/4" size={250} color="hsl(210, 80%, 50%)" />

        {/* Floating icons */}
        <FloatingIcon icon="film" className="top-24 left-[10%] hidden lg:block" delay={0} duration={5} />
        <FloatingIcon icon="scissors" className="top-32 right-[12%] hidden lg:block" delay={1.5} duration={6} />
        <FloatingIcon icon="play" className="bottom-24 left-[15%] hidden lg:block" delay={0.8} duration={5.5} />

        <div className="container mx-auto px-4 sm:px-6 pt-16 pb-12 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Find what viewers{" "}
              <span className="text-primary">actually rewatch</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl">
              Real viewer data shows which moments your audience rewatched —
              extract the best clips and reformat for every platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg" className="group">
                <Link href="/login">
                  Start for free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>

          <div className="mt-12 relative">
            <AnimatedHeatmapHero />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative border-y bg-surface">
        <DotsBackground opacity={0.2} />
        <div className="container mx-auto px-4 sm:px-6 py-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-mono font-bold text-primary">
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

      {/* How it Works */}
      <section id="how-it-works" className="relative container mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
        <DotsBackground opacity={0.15} />
        <div className="relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">How it works</h2>
            <p className="text-muted-foreground mt-2">
              From URL to clips in under 60 seconds
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="relative group glow-crimson-subtle">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto font-mono font-bold text-lg">
                  1
                </div>
                <h3 className="text-lg font-semibold">Paste your URL</h3>
                <p className="text-sm text-muted-foreground">
                  Drop in any YouTube video link. We validate and extract heatmap
                  data automatically.
                </p>
              </CardContent>
            </Card>
            <Card className="relative group glow-crimson-subtle">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary mx-auto font-mono font-bold text-lg">
                  2
                </div>
                <h3 className="text-lg font-semibold">See the heatmap</h3>
                <p className="text-sm text-muted-foreground">
                  View exactly where viewers rewatched. Our algorithm identifies
                  the top moments.
                </p>
              </CardContent>
            </Card>
            <Card className="relative group glow-crimson-subtle">
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto font-mono font-bold text-lg">
                  3
                </div>
                <h3 className="text-lg font-semibold">Export clips</h3>
                <p className="text-sm text-muted-foreground">
                  Select scenes and download vertical clips ready for TikTok,
                  Shorts, or Reels.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Heatmap Wave Divider */}
      <div className="container mx-auto px-4">
        <HeatmapWave />
      </div>

      {/* Why SpikeClip */}
      <section className="relative bg-surface py-20">
        <DotsBackground opacity={0.2} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Why SpikeClip?
            </h2>
            <p className="text-muted-foreground mt-2">
              Built for creators who value data over guesswork
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {LANDING_FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="group hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative container mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={400} />
        <div className="relative z-10 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Start clipping with real data
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Free tier includes 3 analyses per month. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Get started free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
