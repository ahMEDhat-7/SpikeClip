import { DotsBackground } from "@/presentation/components/layout/DotsBackground";

export function ProblemSection() {
  return (
    <section className="relative py-section">
      <DotsBackground opacity={0.7} />
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h2
            className="text-2xl sm:text-3xl font-semibold"
            style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
          >
            Stop guessing which moments to clip
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            You&apos;re watching full videos trying to find the highlights. Switching between
            editing tools. Manually cropping for every platform. Hoping the
            moments you choose actually resonate with your audience.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <div className="h-px w-12 bg-hairline" />
          <span className="font-medium text-foreground">There&apos;s a data-driven way.</span>
          <div className="h-px w-12 bg-hairline" />
        </div>
      </div>
    </section>
  );
}
