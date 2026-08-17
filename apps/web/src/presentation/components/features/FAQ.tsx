"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DotsBackground } from "@/presentation/components/layout/DotsBackground";

const faqs = [
  {
    question: "What data does SpikeClip use?",
    answer:
      "SpikeClip extracts real YouTube heatmap data — the actual engagement data YouTube collects from viewers. Every data point represents real human attention, not AI guesses or predictions.",
  },
  {
    question: "Is my data secure?",
    answer:
      "We only extract heatmap metadata from YouTube videos, not the video content itself. We don't store your video files. All data is encrypted in transit and at rest.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no contracts or commitments. You can upgrade, downgrade, or cancel your plan at any time from your account settings.",
  },
  {
    question: "What happens when I exceed my usage limit?",
    answer:
      "Free tier users can upgrade to Pro for unlimited analyses. Pro users can upgrade to Team or wait for their monthly limit to reset. We'll notify you before you hit the limit.",
  },
  {
    question: "Do I need technical skills?",
    answer:
      "No. Simply paste a YouTube URL and SpikeClip does the rest. The analysis, scene detection, and vertical reformatting are all automatic. No editing experience required.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "SpikeClip exports clips optimized for TikTok, YouTube Shorts, and Instagram Reels. All exports are in 9:16 vertical format with keyframe-accurate cuts.",
  },
  {
    question: "How accurate is the analysis?",
    answer:
      "The analysis is based on real viewer behavior data from YouTube's heatmap. Our spike merging algorithm clusters high-engagement moments with a 5-second gap tolerance and configurable intensity thresholds.",
  },
  {
    question: "Can I try before buying?",
    answer:
      "Yes. The free tier includes 3 heatmap analyses per month with up to 3 scenes per video and 2 clip exports. No credit card required to start.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-hairline last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left gap-4 group"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium group-hover:text-foreground transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="relative py-section">
      <DotsBackground opacity={0.7} />
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-[11px] font-semibold uppercase text-muted-foreground mb-3"
            style={{ letterSpacing: "var(--tracking-wide, 0.06em)" }}
          >
            FAQ
          </p>
          <h2
            className="text-2xl sm:text-3xl font-semibold"
            style={{ letterSpacing: "var(--tracking-display, -0.04em)" }}
          >
            Common questions
          </h2>
        </div>
        <div className="divide-y divide-hairline border-t border-hairline">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
