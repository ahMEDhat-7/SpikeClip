import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DETAILED_FEATURES } from "@/presentation/constants/features";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { GlowOrb } from "@/presentation/components/features/GlowOrb";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Discover how SpikeClip uses real YouTube heatmap data to identify the most-replayed moments and create engaging vertical shorts.",
};

const steps = [
  {
    number: "01",
    title: "Paste YouTube URL",
    description:
      "Drop in any YouTube video link. We validate the URL and extract heatmap data automatically.",
  },
  {
    number: "02",
    title: "View Heatmap Analysis",
    description:
      "See exactly where viewers rewatched. Our visualization highlights peak engagement moments with clear intensity mapping.",
  },
  {
    number: "03",
    title: "Select Scenes",
    description:
      "Review detected scenes ranked by engagement score. Select the moments that fit your content strategy.",
  },
  {
    number: "04",
    title: "Export Vertical Clips",
    description:
      "Download clips reformatted for vertical platforms. Keyframe-accurate cuts with no black bars or upscaling artifacts.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="space-y-0">
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <DotsBackground opacity={0.3} />
        <GlowOrb className="top-20 right-1/4" size={250} />
        <div className="container mx-auto px-4 sm:px-6 pt-16 pb-12 text-center space-y-6 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Features built for{" "}
            <span className="text-primary">data-driven</span> creators
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature is designed to turn raw viewer engagement data into
            actionable content insights.
          </p>
        </div>
      </section>

      <section className="relative container mx-auto px-4 sm:px-6 py-12">
        <DotsBackground opacity={0.15} />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DETAILED_FEATURES.map((feature) => (
            <Card key={feature.title} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="space-y-1.5">
                  {feature.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative bg-surface py-16">
        <DotsBackground opacity={0.2} />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center md:text-left">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-border" aria-hidden="true" />
                )}
                <div className="space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">
          Start analyzing with real data
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Free tier includes 3 analyses per month. No credit card required.
        </p>
        <Button asChild size="lg">
          <Link href="/login">Get started free</Link>
        </Button>
      </section>
    </main>
  );
}
