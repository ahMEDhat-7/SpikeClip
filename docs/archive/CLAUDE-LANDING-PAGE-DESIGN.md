# Execution Plan: High-Converting AI SaaS Landing Page

**Purpose of this document:** This is a task plan for an AI coding agent to apply directly to a SaaS product's marketing site. It is synthesized from four 2026 landing-page conversion studies (TheKitBase, SnapBlock, Devolfs, Orbix Studio). Work through the phases in order. Each task has a concrete deliverable and an acceptance check so the agent (or a human reviewer) can verify completion without ambiguity.

**How to use this file:** Treat each `## Phase` as a work unit. Treat each `- [ ]` as a discrete, independently-completable task. Do not skip Phase 0. If the target codebase already has a design system, adapt tokens/components rather than introducing a second one.

---

## Phase 0 — Inputs the agent needs before starting

Before writing any code, gather or ask the human operator for:

- [ ] Product one-liner (what it does, in one sentence, outcome-first — not category-first)
- [ ] Target user / ICP (role + industry, e.g. "engineering leads at Series A-C startups")
- [ ] The single primary outcome the product delivers (e.g. "cut support ticket resolution time 40%")
- [ ] 3–5 real differentiators (not generic claims like "powerful" or "easy to use")
- [ ] Any existing brand tokens (colors, fonts, logo) — if none exist, the agent will propose a dark-first system (see Phase 2)
- [ ] Real proof assets available: customer logos, testimonials, usage stats, integration partners, review-site badges (G2, Capterra), case study numbers
- [ ] Pricing model: self-serve (show pricing) vs. sales-led (gate behind demo request)
- [ ] Tech stack of the existing site (framework, styling system, component library) so new sections match conventions

**Acceptance check:** All fields above are filled with real data, not placeholders. If proof assets don't exist yet, flag this explicitly rather than inventing numbers — fabricated stats are a credibility risk, not a shortcut.

---

## Phase 1 — Information Architecture (the "argument" of the page)

The single biggest lever on conversion is not visual polish — it's whether the page makes one clear argument in the right order. Across all four references, the same underlying logic repeats: **answer what-is-this, who-is-it-for, does-it-work, and what-does-it-cost, in that order, before asking for commitment.**

- [ ] Choose ONE primary structural pattern for this product (do not blend more than one without reason):
  - **Hero-First / Product-in-Frame** — best when the UI is self-explanatory (dashboards, editors, analytics tools). Show the real product interface above the fold instead of an illustration.
  - **Problem–Agitation–Solution (PAS)** — best when the buyer doesn't yet feel the pain acutely; state the problem, make it feel costly, then resolve it.
  - **Demo-Led** — best for complex/multi-step AI products; embed or animate the product doing its job in the hero itself.
  - **Use-Case Segmented** — best for multi-audience products (e.g. "for marketers / for developers / for founders").
  - **Minimal-Friction** — best for PLG products with an instant free tier; strip the funnel to one field.
- [ ] Lock the section order for the full page. Default recommended order (deviate only with a stated reason):

  1. Navbar (sticky, one primary CTA)
  2. Hero (headline, subheadline, primary CTA, product visual)
  3. Social proof bar (logos or stats — no more than one row)
  4. Problem framing (optional, 1 short section — only if using PAS)
  5. Features (bento grid, 4–6 items max)
  6. How it works (3-step flow)
  7. Use cases (optional, only for multi-audience products)
  8. Deeper social proof (testimonials / case study numbers / ROI stat)
  9. Pricing (with monthly/annual toggle) — omit or move to a dedicated page if sales-led
  10. FAQ (objection handling, 5–8 items)
  11. Final CTA (restate the outcome, one button)
  12. Footer (nav, legal, changelog/blog links)

- [ ] Confirm there is exactly **one** primary call-to-action goal for the whole page (e.g. "Start free trial"). Every button on the page either performs that action or is clearly secondary (e.g. "Watch demo", styled as visually subordinate).

**Acceptance check:** A reviewer scrolling the page top to bottom can answer, in order and without re-reading: what is this → who is it for → does it work / is it legit → how do I start → what does it cost. No section requires the visitor to have read a later section to make sense.

---

## Phase 2 — Design system setup

- [ ] If no design tokens exist, implement a dark-first token system (AI/dev-tool products read as more technical and credible on dark backgrounds — do not default to light/white unless the brand is explicitly consumer/playful):

```css
@theme {
  --color-background:   oklch(0.07 0.02 280);
  --color-card:         oklch(0.11 0.02 280);
  --color-primary:      oklch(0.68 0.18 290);
  --color-primary-glow: oklch(0.68 0.18 290 / 0.15);
  --color-border:       oklch(1 0 0 / 0.08);
  --color-foreground:   oklch(0.96 0 0);
  --color-muted:        oklch(0.65 0.02 280);
}
```

- [ ] Define exactly one accent color and reuse it for every CTA, link, and highlight — do not introduce a second accent color for "variety."
- [ ] Set base typography: one display font for headlines, one system/sans font for body. Headline weight should be bold enough to scan in under 1 second.
- [ ] Establish a spacing scale (4/8/12/16/24/32/48/64/96px or the framework's equivalent) and use it consistently across all new sections — no arbitrary pixel values.
- [ ] Confirm dark-mode is flash-free on load (no white flash before theme hydrates) if the framework supports SSR.

**Acceptance check:** Every new section reuses the same 4 color tokens, 1 accent, and shared spacing scale. Nothing hardcodes a new hex value.

---

## Phase 3 — Build the Hero section

The hero is the only section every visitor sees. It must do three things at once: state what the product is, show it working, and give a reason to keep reading. The visitor decides whether to stay within the first several seconds — most AI landing pages fail here by describing the product in adjectives instead of showing it in motion.

- [ ] **Headline:** state a specific, measurable outcome — not a product category and not a vague superlative.
  - Good pattern: "[Outcome verb] + [specific metric or result]" — e.g. "Cut support response time by 40%."
  - Bad pattern: category labels ("The future of intelligent automation") or compound claims joined by commas (a headline with a comma usually needs to be split or cut).
- [ ] **Subheadline:** one sentence stating who the product is for and the mechanism (how it delivers the outcome).
- [ ] **Primary CTA:** action verb + outcome, not a bare "Get Started" — e.g. "Start building free," "Try it free — no card required." If the product has a free tier, say so directly in or beside the CTA; this measurably reduces perceived risk.
- [ ] **Secondary CTA (optional):** visually subordinate (ghost/outline button), e.g. "Watch demo." Never give two CTAs equal visual weight — one primary action per screen.
- [ ] **Hero visual — this is the highest-leverage single element on the page:**
  - Show the actual product interface: a real dashboard, a live data/API stream, an animated response log, or an embedded interactive demo.
  - Do NOT use abstract 3D illustrations, generic gradients, or stock "AI brain/network" imagery — pages that show real product UI in the hero consistently outconvert pages that use concept art.
  - If the product is genuinely visual (video, image generation), the hero visual should be a short motion clip, not a static screenshot.
- [ ] Ensure the primary CTA is visible without scrolling on every viewport down to 360px width. If it requires a scroll on mobile, this is a blocking bug, not a nice-to-have.

**Acceptance check:** Cover the rest of the page and show only the hero to a first-time viewer. They should be able to say, unprompted: what the product does, who it's for, and what happens if they click the button.

---

## Phase 4 — Social proof bar (directly below the hero)

Placed immediately after the hero, before any feature explanation — its only job is to pre-answer "is this legitimate?" before the visitor has invested enough attention to care about features. Burying trust signals below the fold or after the feature section measurably lowers conversion.

- [ ] Choose ONE format based on available proof assets:
  - **Logo wall** — real customer logos, grayscale (grayscale reads as more professional than full color in this strip specifically).
  - **Integration bar** — "Works with OpenAI, Anthropic, Vercel, ..." — valid even pre-revenue, since it borrows credibility from known platforms.
  - **Stat strip** — 2–4 hard numbers ("12,000+ users," "98% uptime," "$0 to first result in 5 minutes"). Numbers must be real; do not fabricate.
  - **Named research/ROI citation** — a specific percentage tied to a named source (e.g. a cited study), which carries more weight than a generic claim.
- [ ] Keep it to a single row. Do not stack multiple proof formats — this reads as compensating for weak proof rather than strengthening it.
- [ ] If genuinely no proof assets exist yet, skip this section rather than filling it with placeholder logos or invented numbers — flag it as a follow-up task once real customers exist.

**Acceptance check:** The proof element appears before the user scrolls past the first two viewport-heights, and every number/logo shown is real and sourced.

---

## Phase 5 — Features section (bento grid)

Most AI landing pages lose visitors here by either writing paragraphs of capability description or using a flat grid of identical icon+title+description cards that blur together. A bento grid (uneven card sizes) fixes this by giving the primary differentiator visual weight over supporting features.

- [ ] Select 4–6 features maximum. More than 6 causes visitors to stop reading — cut the list rather than expand the grid.
- [ ] Assign the single biggest differentiator to the large/featured cell (roughly double width vs. supporting cells).
- [ ] Each cell: one short title + one sentence of description + one icon or small inline visual. If a cell needs more than two sentences, that content belongs in docs, not the landing page.
- [ ] Use one consistent icon style across all cells — mixed icon styles (e.g. line icons next to filled icons) reads as unpolished.
- [ ] Implement responsively:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.bento-featured { grid-column: span 2; }

@media (max-width: 768px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-featured { grid-column: span 1; }
}
```

- [ ] Give every cell a subtle border or background fill so cells are visually distinct while scanning quickly.

**Acceptance check:** A visitor scanning the grid for 5 seconds per cell (not reading closely) can state what each feature does. If any cell requires careful reading to understand, rewrite it.

---

## Phase 6 — "How it works" section

After features, the visitor understands *what* the product does but not *how they'd actually use it*. This section removes that objection with a numbered flow.

- [ ] Use exactly 3 steps. Three feels achievable; more than three starts to feel like setup work, which suppresses conversion.
- [ ] Step 1 = lowest-friction possible action ("Sign up free," "Connect your data source," "Install the SDK").
- [ ] Step 2 = the configuration step, described in one sentence.
- [ ] Step 3 = the outcome — what the user has once the flow is complete (tie this back to the hero headline's promised outcome).
- [ ] Label steps with action verbs ("Connect," "Generate," "Ship") not nouns ("Connection," "Generation," "Deployment").
- [ ] Add a visual connector (line, arrow, or numbered circles) between steps so the eye follows the sequence without re-reading labels.

**Acceptance check:** The three step labels alone (without body copy) form a coherent mini-story of using the product.

---

## Phase 7 — Deeper social proof / evidence section

Distinct from the top-of-page proof bar — this section, placed after features/how-it-works, should carry weight: testimonials, case-study numbers, or a named ROI/efficiency study. This is where "feature → benefit → proof" closes the loop opened in Phase 5.

- [ ] For each major feature or claim made earlier on the page, pair it with one proof point if available (stat, quote, or logo tied to a specific result) — e.g. "Real-time analytics dashboard → faster decisions → reduced reporting time by 70% for 1,200+ teams." Feature and benefit alone don't convert; proof is what removes doubt.
- [ ] Prefer named, specific numbers over vague claims. "184,000 businesses use this" outperforms "trusted by thousands." A number with no name attached, or a name with no number, both read as weaker evidence than the two combined.
- [ ] If using testimonials, use 2–3 max, each tied to a specific, credible role (not just "Jane D., CEO" with no context) and a specific result, not a generic compliment.

**Acceptance check:** Every quantitative claim on the page traces back to a real, named source. No invented statistics.

---

## Phase 8 — Pricing section

- [ ] Implement a monthly/annual toggle — this is not optional. It reframes annual pricing as a choice rather than a commitment and surfaces the savings percentage, which anchors the annual plan as the default "smart" choice.

```javascript
const [billing, setBilling] = useState<"monthly" | "annual">("annual");

const price = {
  starter: billing === "monthly" ? 29 : 19,
  pro:     billing === "monthly" ? 79 : 59,
  team:    billing === "monthly" ? 199 : 149,
};

const savings = billing === "annual" ? "Save 35%" : null;
```

- [ ] Default the toggle to **annual** selected — most visitors will not change the default, so the default carries real weight.
- [ ] Show the savings percentage prominently on the toggle itself, not in small print below it.
- [ ] Mark exactly one tier "Most Popular" or "Recommended" — this anchors decision-making and should not be split across two tiers.
- [ ] Limit each tier's feature list to 4–6 bullets. Longer lists should link out to a full comparison/docs page instead of living in the pricing card.
- [ ] Include a free tier or free trial if the product model supports it — AI SaaS products without a free entry point convert measurably worse.
- [ ] If the product is sales-led (usage-based enterprise pricing, custom contracts), do not force numbers into cards — use "Contact sales" / "Book a demo" as the CTA on the top tier instead of a fabricated price.

**Acceptance check:** A visitor can select a plan and understand exactly what they get and what it costs without leaving the section or opening a FAQ.

---

## Phase 9 — FAQ / objection handling

- [ ] Write 5–8 FAQ entries targeting the specific objections a skeptical buyer in this category would have (data privacy, usage limits, what happens after the free trial, integration requirements, cancellation policy).
- [ ] Do not use FAQ entries to restate marketing copy — each answer should resolve a real hesitation, in plain language.
- [ ] Place this after pricing and before the final CTA, so it catches visitors who scrolled past pricing without converting.

**Acceptance check:** Each FAQ answer is a genuine objection-resolution, not a repeated value proposition.

---

## Phase 10 — Final CTA + Footer

- [ ] Final CTA section restates the core outcome from the hero headline (not just a repeated "Sign up" button with no context) and offers the same single primary action as the hero.
- [ ] Footer includes: product nav, resources (docs, blog, changelog), legal (privacy, terms), and social links. Link to blog and changelog from both nav and footer for internal SEO value.
- [ ] Confirm the whole page has exactly one CTA destination — check that no competing CTA text/labels were introduced in later sections that dilute the primary action.

**Acceptance check:** Grep the page for all CTA button labels — confirm they map to at most 2 distinct actions (primary + one secondary, e.g. "demo"), not a scattered set of different asks.

---

## Phase 11 — Supporting pages (only if in scope for this task)

If the agent's task includes more than the landing page itself:

- [ ] **Auth pages (login/signup):** match the dark/brand aesthetic of the marketing site — a plain white auth form after a styled dark landing page breaks continuity and reads as unfinished. Minimize fields to email + password or SSO only; defer name/company to onboarding. Add a one-line value reminder on the page itself (e.g. "Start building in 2 minutes. No credit card required.").
- [ ] **Changelog:** stand up a changelog page and ship an entry for every meaningful update, however small — a visibly active changelog signals a maintained, healthy product to late-stage evaluators.
- [ ] **Blog:** seed with SEO-targeted posts answering real search queries in the product's category (e.g. "How to process PDFs with AI" beats "Our vision for the future of documents"). Include both blog and changelog in the sitemap immediately, even before they have much content.

**Acceptance check:** Auth pages visually continue the marketing site's brand without a jarring transition; changelog/blog exist in the sitemap and are linked from nav/footer.

---

## Phase 12 — Performance, mobile, and technical QA (non-negotiable, not polish)

These are conversion levers, not a technical backlog — treat failures here as blocking, not follow-up tickets.

- [ ] **Mobile-first check:** over 60% of SaaS landing page traffic is mobile. Test every section at 360px, 390px, and 768px widths before considering the page done.
- [ ] **Above-the-fold CTA:** primary CTA must be visible without scrolling on every device size tested above.
- [ ] **Page speed:** target sub-2.5s LCP. A one-second delay in load time reduces conversion by roughly 7% — treat this as a real cost, not an abstraction. Use SSR/static generation where the framework supports it.
- [ ] **One CTA per screen:** re-audit after all phases are complete — confirm no section introduces a second competing primary action.
- [ ] **Accessibility pass:** color contrast (especially on a dark theme — check muted text against background), keyboard navigation on the pricing toggle and nav, alt text on all product visuals.
- [ ] **Lighthouse / PageSpeed run:** capture a before/after score if this plan is being applied to an existing page.

**Acceptance check:** Lighthouse mobile performance score, LCP time, and CTA visibility are recorded and meet the targets above before marking this plan complete.

---

## Phase 13 — Final self-check (run before declaring the task done)

Run this table against the finished page. Every row must pass.

| Element | What to check | Pass condition |
|---|---|---|
| Headline | Names a specific outcome, not a category, no comma-joined multi-claim | e.g. "Cut reporting time 70%" not "Intelligence at the speed of thought" |
| Hero visual | Shows real product UI/output, not illustration | Screenshot, live data stream, or embedded demo |
| CTAs above the fold | Exactly one primary action | Single button, clear label with outcome |
| CTA friction | Minimal fields, no forced credit card for free tier | Email-only or SSO where possible |
| First trust signal | Appears before the first feature section | Logo/stat bar directly under hero |
| Feature count | 4–6 items, bento-weighted | No dense feature wall |
| How-it-works | Exactly 3 steps, action-verb labels | Numbered, visually connected |
| Pricing toggle | Present, defaults to annual, shows savings | Toggle implemented and functional |
| Proof specificity | Numbers are real and named, not vague | No "thousands of users" without a source |
| Mobile LCP | Under ~2.5s | Verified via Lighthouse |
| Mobile CTA visibility | Visible without scroll at 360px | Verified manually |

**Definition of done:** every row in the table above passes, every field from Phase 0 was used (not left as a placeholder), and the page tells one coherent story from hero to final CTA with a single primary action throughout.

---

## Reference sources synthesized into this plan
- TheKitBase — "The Anatomy of a High-Converting AI SaaS Landing Page"
- SnapBlock — "The Best SaaS Landing Page Structures That Convert in 2026"
- Devolfs — "20 High-Converting AI & SaaS Landing Pages"
- Orbix Studio — "25 High-Converting SaaS Landing Page Examples 2026"
