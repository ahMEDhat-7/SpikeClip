import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";
import { ScrollReveal } from "@/presentation/components/features/ScrollReveal";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Clutch. Choose the plan that fits your workflow.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try Clutch with limited analyses",
    features: [
      "3 heatmap analyses per month",
      "Up to 3 scenes per video",
      "2 clip exports per month",
      "View engagement data",
      "Scene editor with heatmap",
      "Standard processing speed",
    ],
    cta: "Get Started",
    href: "/login",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "Full pipeline for solo creators",
    features: [
      "Unlimited heatmap analyses",
      "Up to 10 scenes per video",
      "10 clip exports per month",
      "Vertical reformatting (9:16)",
      "Priority processing",
      "All export formats",
      "Prompt-based editing",
    ],
    cta: "Start Pro Trial",
    href: "/login",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For agencies and teams",
    features: [
      "Everything in Pro",
      "Up to 25 scenes per video",
      "20 clip exports per month",
      "5 team seats",
      "Priority support",
      "API access",
      "Batch processing",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@clutchapp.dev",
    variant: "outline" as const,
  },
];

export default function PricingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-background pt-section pb-12">
        <DotsBackground opacity={0.7} />
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-4 relative z-10">
          <h1 className="text-3xl sm:text-4xl font-semibold" style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your workflow. All plans include our core
            heatmap analysis technology.
          </p>
        </div>
      </section>

      <ScrollReveal>
        <section className="relative bg-background pt-8 pb-section">
          <DotsBackground opacity={0.7} />
          <div className="container mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col transition-all ${
                  tier.popular
                    ? "border-primary/40 shadow-xl shadow-primary/10 hover:shadow-2xl hover:shadow-primary/15 scale-[1.02]"
                    : "hover:border-hairline-strong hover:shadow-md"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 px-4 py-1 text-xs font-bold shadow-lg shadow-primary/30">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-mono font-bold">
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {tier.period}
                    </span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={tier.variant}
                    className="w-full mt-6 rounded-full"
                    asChild
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="relative bg-background border-t border-hairline py-section">
        <DotsBackground opacity={0.7} />
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-4 relative z-10">
          <h2 className="text-2xl font-semibold" style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}>Need something custom?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            For enterprise needs, API access, or custom integrations, reach out
            to our team.
          </p>
          <Button variant="outline-hairline" asChild>
            <Link href="mailto:hello@clutchapp.dev">Contact us</Link>
          </Button>
        </div>
      </section>
      </ScrollReveal>
    </main>
  );
}
