# Unified Landing Page Design Plan

## Purpose

Combine best practices from `CLAUDE-LANDING-PAGE-DESIGN.md` and `GPT-LANDING-PAGE-DESIGN.md` into a single implementation plan for SpikeClip (Clutch) frontend.

---

## Current State Assessment

### What Already Works Well (Keep)
- Dark-first design system with warm color tokens (Craft.do-inspired)
- Glass-morphism header with floating nav
- Spring-physics `AlignmentGridHero` animation
- `DotsBackground` consistent across pages
- `ScrollReveal` progressive disclosure
- `gradient-text` and `gradient-border-btn` CTA styles
- Cursor glow effect, `prefers-reduced-motion` support
- Proper SEO metadata + structured data
- Mobile responsive (tested at 360px+)
- 4 features in "Why Clutch" section (within 4–6 limit)
- 3-step "How it works" (correct count per both docs)
- Clip Studio section shows real product UI mockup

### What's Missing
1. No FAQ section (both docs require 5–8 objection-handling FAQs)
2. No social proof bar below hero
3. No real product UI in hero (abstract animation instead)
4. No visual connectors between "How it works" steps
5. No annual/monthly pricing toggle
6. No deeper social proof section
7. No differentiation section
8. Footer is minimal (missing blog, changelog, social links)
9. Pricing page has no toggle or savings %

---

## Unified Section Order

```
1.  Navbar (sticky, one primary CTA)         — EXISTS ✅
2.  Hero — real product UI visual             — REPLACE abstract animation
3.  Social Proof Bar                          — NEW (integration logos)
4.  Problem Framing (PAS)                     — NEW
5.  How It Works (3 steps + connectors)       — EXISTS, add connectors
6.  Features (bento grid, 4 items)            — EXISTS, refine layout
7.  Clip Studio showcase                      — EXISTS, keep as product demo
8.  Pricing (monthly/annual toggle)           — EXISTS, add toggle
9.  FAQ (8 items)                             — NEW
10. Final CTA (outcome restatement)           — EXISTS, strengthen
11. Footer (expanded links)                   — EXISTS, expand
```

---

## 10-Task Implementation Breakdown

### Task 1: Hero Visual Replacement
**File:** `apps/web/src/app/page.tsx`

- Remove `AlignmentGridHero` import and component
- Add real product screenshot (heatmap dashboard or Clip Studio)
- Wrap in styled container (rounded-2xl, border, subtle shadow)
- Add trust microcopy under CTA: "Free tier · No credit card required"
- Keep headline, subtext, CTAs as-is
- Ensure image is responsive

### Task 2: Social Proof Bar
**New file:** `apps/web/src/presentation/components/features/SocialProofBar.tsx`
**Modified file:** `apps/web/src/app/page.tsx`

- Create component with grayscale integration logos
- Platforms: YouTube, TikTok, YouTube Shorts, Instagram Reels
- Use SVG icons (no external dependencies)
- Place directly below hero
- Style: single row, compact, muted, border-y border-hairline

### Task 3: Problem Framing Section
**New file:** `apps/web/src/presentation/components/features/ProblemSection.tsx`
**Modified file:** `apps/web/src/app/page.tsx`

- PAS copy:
  - Problem: "You're spending hours clipping videos manually"
  - Agitation: "Guessing which moments to cut. Switching between tools."
  - Solution: "Real viewer data shows you exactly what to clip."
- Place between social proof and "How it works"
- Style: centered, 1 paragraph max

### Task 4: How It Works Connectors
**File:** `apps/web/src/app/page.tsx`

- Add horizontal arrow/line between steps on desktop
- Use CSS `::after` or inline SVG
- Steps: "Paste your URL" → "See the heatmap" → "Export clips"
- Hidden on mobile (steps stack)

### Task 5: Features Bento Grid
**File:** `apps/web/src/app/page.tsx`

- Refactor 2×2 → bento layout
- First card ("Real viewer data") spans 2 columns
- Remaining 3 cards in row
- Mobile: all stack to single column
- Keep existing content

### Task 6: Pricing Toggle
**File:** `apps/web/src/app/pricing/page.tsx`

- Add `useState<"monthly" | "annual">("annual")` toggle
- Default to annual
- Show "Save X%" badge
- Update prices: Pro $19→$15, Team $49→$39
- Keep "Most Popular" on Pro

### Task 7: FAQ Section
**New file:** `apps/web/src/presentation/components/features/FAQ.tsx`
**Modified file:** `apps/web/src/app/page.tsx`

- 8 accordion items:
  1. What data does Clutch use?
  2. Is my data secure?
  3. Can I cancel anytime?
  4. What happens when I exceed my limit?
  5. Do I need technical skills?
  6. Which platforms are supported?
  7. How accurate is the analysis?
  8. Can I try before buying?
- Style: accordion with chevron, border-hairline dividers
- Place before final CTA

### Task 8: Final CTA
**File:** `apps/web/src/app/page.tsx`

- Update headline to "Find what viewers actually rewatch — start free"
- Remove secondary "See pricing" CTA
- Keep "No credit card required"
- Single primary CTA: "Get started free"

### Task 9: Footer Expansion
**File:** `apps/web/src/presentation/components/layout/Footer.tsx`

- Add: Blog, Changelog, Documentation, GitHub, Twitter/X, Dashboard, Studio
- Restructure to 4-column layout on desktop
- Keep existing legal links

### Task 10: CSS Adjustments
**File:** `apps/web/src/app/globals.css`

- Bento grid responsive styles
- FAQ accordion animation
- Visual connector arrow styles
- No new color tokens needed

---

## Verification

After implementation:
- `pnpm lint` must pass (tsc --noEmit)
- CTA visible without scroll at 360px
- All sections readable at 390px, 768px
- No fabricated claims
- Single primary CTA per screen
- FAQ accordion works
- Pricing toggle works
- Bento grid responsive
- Connectors show on desktop, hidden on mobile
