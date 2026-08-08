import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { GlowOrb } from "@/presentation/components/features/GlowOrb";
import { ScrollReveal } from "@/presentation/components/features/ScrollReveal";
import { BarChart3, Users, Target, Zap, DollarSign, TrendingUp, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "SpikeClip uses real YouTube heatmap data to identify the most-replayed moments. Built for creators who value data over guesswork.",
};

const whatWhyWho = [
  {
    icon: BarChart3,
    title: "What is SpikeClip?",
    items: [
      "Heatmap-driven clip extraction tool",
      "Real viewer replay data — not AI guesses",
      "Two-stage: Analyze (data) + Studio (edit)",
      "Vertical 9:16 format for every platform",
    ],
  },
  {
    icon: Users,
    title: "Who is it for?",
    items: [
      "Solo creators scaling content output",
      "Agencies managing multiple channels",
      "Visual niches (cooking, gaming, tutorials)",
      "Anyone tired of guessing clip moments",
    ],
  },
  {
    icon: TrendingUp,
    title: "Why use this?",
    items: [
      "Data > guesswork — real engagement signals",
      "Prompt-based editing (\"vibe editing\")",
      "Extract, don't recreate — preserve context",
      "From URL to clips in under 60 seconds",
    ],
  },
];

const monetizationData = {
  platforms: [
    { name: "YouTube Shorts", rpm: "$0.04 - $0.30", views: "per 1K views" },
    { name: "TikTok Creator Rewards", rpm: "$0.40 - $1.00", views: "per 1K views" },
    { name: "Instagram Reels", rpm: "$0.01 - $0.12", views: "per 1K views" },
  ],
  sponsorships: [
    { tier: "Nano (1K-10K)", rate: "$25 - $150", per: "per post" },
    { tier: "Micro (10K-100K)", rate: "$250 - $1.5K", per: "per post" },
    { tier: "Mid (100K-500K)", rate: "$1.5K - $8K", per: "per post" },
    { tier: "Macro (500K+)", rate: "$8K - $100K+", per: "per post" },
  ],
  streams: [
    "Ad revenue (long-form funnel)",
    "Sponsorships & brand deals",
    "Affiliate marketing",
    "Merch & products",
    "Licensing viral clips",
  ],
};

const storySections = [
  {
    label: "The problem",
    text: 'Creators spend hours manually reviewing videos to find the "perfect clip moment." Most guess based on intuition, resulting in inconsistent content quality and missed opportunities. Meanwhile, YouTube quietly collects heatmap data showing exactly which moments viewers rewatch — the strongest signal of viral potential.',
  },
  {
    label: "Our approach",
    text: "SpikeClip extracts YouTube heatmap data and uses our v2 spike merging algorithm with gap-tolerant clustering to identify the most-engaged moments. No AI guesses. No sentiment analysis. Just raw viewer behavior translated into actionable clip suggestions.",
  },
  {
    label: "The result",
    text: "Creators get data-driven clip suggestions in under 60 seconds. Every recommendation is backed by actual viewer attention. Higher engagement, less guesswork, and a content workflow that scales.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-section">
        <DotsBackground opacity={0.3} />
        <GlowOrb className="top-20 right-1/4" size={250} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight">
            Built for creators who{" "}
            <span className="text-primary">measure</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            SpikeClip was born from a simple frustration: why guess which moments
            to clip when YouTube already tells you what viewers rewatch?
          </p>
        </div>
      </section>

      <ScrollReveal>
        {/* 3-Column Grid: What / Why / Who */}
        <section className="relative bg-surface py-section">
          <DotsBackground opacity={0.2} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {whatWhyWho.map((section) => (
                <Card key={section.title} className="group transition-colors hover:border-hairline-strong">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <section.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        {/* Story Sections */}
        <section className="container mx-auto px-4 sm:px-6 py-section">
          <div className="max-w-3xl mx-auto space-y-10">
            {storySections.map((section) => (
              <div key={section.label} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-primary" />
                  <h2 className="text-xl sm:text-2xl font-normal">{section.label}</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed pl-4">
                  {section.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        {/* Earn Money Section */}
        <section className="relative bg-surface py-section">
          <DotsBackground opacity={0.2} />
          <GlowOrb className="bottom-10 left-1/4" size={300} color="hsl(142, 71%, 45%)" />
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-normal">
                Earn money with <span className="text-primary">SpikeClip</span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                Shorts are discovery engines that funnel viewers to your long-form content.
                Here&apos;s how creators monetize across platforms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Platform RPMs */}
              <Card className="group transition-colors hover:border-hairline-strong">
                <CardContent className="p-6 space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Platform RPMs</h3>
                  <div className="space-y-3">
                    {monetizationData.platforms.map((platform) => (
                      <div key={platform.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{platform.name}</span>
                          <span className="font-mono font-bold text-primary">{platform.rpm}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{platform.views}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sponsorships */}
              <Card className="group transition-colors hover:border-hairline-strong">
                <CardContent className="p-6 space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Sponsorships</h3>
                  <div className="space-y-3">
                    {monetizationData.sponsorships.map((sponsor) => (
                      <div key={sponsor.tier} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{sponsor.tier}</span>
                          <span className="font-mono font-bold text-primary">{sponsor.rate}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{sponsor.per}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Streams */}
              <Card className="group transition-colors hover:border-hairline-strong">
                <CardContent className="p-6 space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Revenue Streams</h3>
                  <ul className="space-y-2">
                    {monetizationData.streams.map((stream) => (
                      <li key={stream} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {stream}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA Section */}
      <ScrollReveal>
      <section className="relative container mx-auto px-4 sm:px-6 py-section text-center space-y-6">
        <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={350} />
        <div className="relative z-10 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-normal">
            Ready to clip with data?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Join creators using real viewer data to make better content decisions.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Get started free</Link>
          </Button>
        </div>
      </section>
      </ScrollReveal>
    </main>
  );
}
