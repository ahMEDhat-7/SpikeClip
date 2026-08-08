import { EditTemplate } from "../entities/template";

export const TEMPLATES: EditTemplate[] = [
  {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    description:
      "Punchy, animated text that changes dynamically. Words pop up one by one or phrase by phrase, often highlighted with bold colors and varied fonts. Perfect for educational content, listicles, and tech reviews.",
    category: "kinetic",
    preview: "/templates/kinetic.svg",
    config: {
      textAnimation: "pop",
      transitionIn: "fade",
      transitionOut: "fade",
      layout: "full",
      textPosition: "center",
      textStyle: "bold",
      overlayEffects: ["countdown-numbers", "vignette"],
    },
  },
  {
    id: "photo-dump",
    name: "Photo Dumps & Collages",
    description:
      "A grid layout or rapidly changing series of 3 to 10 photos/short clips synced to an upbeat trending audio track. Creates a slice-of-life or behind-the-scenes aesthetic.",
    category: "collage",
    preview: "/templates/collage.svg",
    config: {
      textAnimation: "slide",
      transitionIn: "cut",
      transitionOut: "cut",
      layout: "grid",
      textPosition: "bottom",
      textStyle: "outlined",
      overlayEffects: ["grid-sync", "photo-flash"],
    },
  },
  {
    id: "split-screen",
    name: "Split-Screen Commentary",
    description:
      "The screen is split in half. Top half features a reaction, talking head, or B-roll. Bottom half displays gameplay, podcast excerpt, or article. Provides constant visual stimulation.",
    category: "split",
    preview: "/templates/split.svg",
    config: {
      textAnimation: "fade",
      transitionIn: "slide",
      transitionOut: "slide",
      layout: "split-horizontal",
      textPosition: "top",
      textStyle: "shadow",
      overlayEffects: ["grid-sync", "photo-flash", "bg-overlay"],
    },
  },
  {
    id: "pov",
    name: "POV (First-Person)",
    description:
      'Text overlays that start with "POV:". The camera acts as a first-person viewer experiencing a specific, relatable, or exaggerated scenario. Highly engaging and shareable.',
    category: "pov",
    preview: "/templates/pov.svg",
    config: {
      textAnimation: "pop",
      transitionIn: "zoom",
      transitionOut: "fade",
      layout: "full",
      textPosition: "top",
      textStyle: "shadow",
      overlayEffects: ["pov-label", "vignette"],
    },
  },
  {
    id: "transition-loop",
    name: "Transition Loops",
    description:
      "A video sequence that connects the end of the clip to the beginning, creating a seamless infinite loop. Artificially inflates watch time and completion rate for algorithm boosting.",
    category: "loop",
    preview: "/templates/loop.svg",
    config: {
      textAnimation: "none",
      transitionIn: "fade",
      transitionOut: "fade",
      layout: "full",
      textPosition: "bottom",
      textStyle: "bold",
      overlayEffects: ["flash-transition", "bg-overlay"],
    },
  },
  {
    id: "countdown",
    name: "Countdown Timer",
    description:
      "A dramatic countdown from 5 or 3 with bold numbers, sound effects, and flash transitions. Creates urgency and anticipation for reveals, drops, or key moments.",
    category: "kinetic",
    preview: "/templates/countdown.svg",
    config: {
      textAnimation: "pop",
      transitionIn: "zoom",
      transitionOut: "cut",
      layout: "full",
      textPosition: "center",
      textStyle: "bold",
      overlayEffects: ["countdown-numbers", "flash-transition"],
    },
  },
  {
    id: "quote-card",
    name: "Quote Cards",
    description:
      "Elegant text overlay on a semi-transparent background with attribution. Perfect for highlighting memorable quotes, tips, or key takeaways from longer content.",
    category: "kinetic",
    preview: "/templates/quote.svg",
    config: {
      textAnimation: "fade",
      transitionIn: "fade",
      transitionOut: "fade",
      layout: "full",
      textPosition: "center",
      textStyle: "shadow",
      overlayEffects: ["quote-marks", "bg-overlay"],
    },
  },
  {
    id: "tutorial-steps",
    name: "Tutorial Steps",
    description:
      "Numbered step indicators with progress bar. Each step gets a title card and transition. Ideal for how-to content, recipes, DIY, and educational clips.",
    category: "kinetic",
    preview: "/templates/tutorial.svg",
    config: {
      textAnimation: "slide",
      transitionIn: "slide",
      transitionOut: "slide",
      layout: "full",
      textPosition: "top",
      textStyle: "outlined",
      overlayEffects: ["step-numbers", "progress-bar"],
    },
  },
  {
    id: "meme-reaction",
    name: "Meme Reaction",
    description:
      "Bold, oversized text with zoom-in effect synced to a reaction moment. Uses impact-style font with outline. Perfect for comedic highlights and viral moments.",
    category: "kinetic",
    preview: "/templates/meme.svg",
    config: {
      textAnimation: "pop",
      transitionIn: "zoom",
      transitionOut: "cut",
      layout: "full",
      textPosition: "center",
      textStyle: "outlined",
      overlayEffects: ["zoom-shake", "impact-text"],
    },
  },
  {
    id: "before-after",
    name: "Before / After",
    description:
      "Split-screen comparison with a sliding reveal. Left side shows 'before', right side shows 'after'. Great for transformations, tutorials, and dramatic reveals.",
    category: "split",
    preview: "/templates/before-after.svg",
    config: {
      textAnimation: "slide",
      transitionIn: "slide",
      transitionOut: "slide",
      layout: "split-vertical",
      textPosition: "bottom",
      textStyle: "bold",
      overlayEffects: ["split-labels", "bg-overlay"],
    },
  },
];
