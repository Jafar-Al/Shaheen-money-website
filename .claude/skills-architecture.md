# Skill architecture — Shaheen Money

How the 34 design skills installed for this project fit together, and which one wins when two disagree.
Sources, commits and the security review are in `.claude/skills-lock.json`.

## 0. Project truth outranks every skill

A skill's suggestion never overrides these:

1. **The falcon, the globe and the logo are fixed.** `src/components/home/FalconFlight.astro`, `src/components/home/Globe.astro`, the mark, and the `motion/` renders keep their drawing, style, keyframes and proportions. Work around them, never on them, unless the owner asks in so many words.
2. **Tokens.** `design/tokens.json` (built by `npm run tokens`, enforced by `npm run lint:styles`) is the colour, type, radius, motion and layout source. Skills may propose changes to the tokens; they may not hard-code around them.
3. **Stack.** Astro + Tailwind v4. No React, no React Three Fiber, no framework added for a skill's sake. Motion and 3D ship as Astro `<script>` modules or islands without a UI framework.
4. **Nothing may look AI-generated.** No stock heroes, no generated portraits or personas, no mock app screens with invented names or balances. Imagery must be real and sourced: brand assets, real geography, real numbers.
5. **Site structure.** Five nav pages. New content becomes a homepage section with a stable id.

## Direction

Premium, art-directed fintech: memorable in the first second, cinematic where it earns it, and excellent in Arabic/RTL and on mobile. The target is not a clean template. Every section needs a visual and a functional reason to exist.

## Layers and precedence

When two skills overlap, the **lead** decides and the others advise.

| # | Layer | Lead | Supporting | Notes |
|---|---|---|---|---|
| 1 | Art direction | `impeccable` | `frontend-design` (plugin) | impeccable runs in **Persuade** mode for marketing pages. |
| 2 | UI/UX | `impeccable` (shape, clarify, distill) | `ui-ux-pro-max` | Use ui-ux-pro-max for UX rules and stack lookups only (see conflicts). |
| 3 | Design system | `design-system` | `impeccable` document/extract | One `DESIGN.md` at most, generated from the code. `design/tokens.json` stays canonical. |
| 4 | Visual design, layout, composition | `impeccable` (layout, bolder, delight, overdrive) | `frontend-design` | |
| 5 | Typography | `impeccable` (typeset) | `arabic-uiux-master` | Never letter-space Arabic. Latin and Arabic need separate scales and line-heights. |
| 6 | Colour | `impeccable` (colorize) | `anti-slop` | Work inside the token palette. |
| 7 | Imagery | `impeccable` (visualize) | — | Rule 0.4 applies. Prefer SVG, real geography, data graphics and brand photography over decoration. |
| 8 | Motion | `motion-design` (direction, choreography) | `gsap-*` (build), `dotlottie-web` (Lottie), `review-animations` (QA gate) | See the motion scope below. |
| 9 | 3D/WebGL | `threejs-*` | `gsap-scrolltrigger` for scroll-driven scenes | Vanilla Three.js, lazy-loaded, with a static fallback. |
| 10 | Responsive | `impeccable` (adapt) | `mobile-native` | Test at 360, 390, 768, 1280 and 1440 wide. |
| 11 | Accessibility | `accessibility` (WCAG 2.2) | `ux-ui-audit`, the existing `@axe-core/playwright` tests | |
| 12 | Performance | `performance`, `core-web-vitals` | `web-quality-audit`, `best-practices`, `seo`, `lighthouserc.json` | Any WebGL/Lottie/GSAP payload must fit the Lighthouse budgets. |
| 13 | Visual QA | `ux-ui-audit` (measured, RTL/LTR parity) | `design-critique`, `review-animations`, impeccable audit/critique/polish | |
| 14 | Anti-AI-slop | `impeccable` (`reference/craft-floor.md` bans) | `anti-slop` | Both apply at all times. They agree on every rule. |

## Motion scope

- **Micro-interactions and UI chrome** (buttons, menus, form feedback, dialogs): 100–300 ms, ease-out on enter, transform and opacity only. `review-animations` enforces this.
- **Cinematic and scroll-told sections**: `motion-design` sets the timing, choreography and personality, and GSAP + ScrollTrigger builds them. Longer durations and scrubbed timelines are allowed here. The short-duration rule above does not apply to these sections.
- **Reduced motion is mandatory** everywhere. Use `prefers-reduced-motion` with a meaningful static state, and wrap GSAP in `gsap.matchMedia()`.
- **Page transitions** use Astro's built-in View Transitions, not barba.js. If they are enabled, kill GSAP/ScrollTrigger instances on `astro:before-swap` and re-init them on `astro:page-load`.
- **Smooth scrolling**: no vetted Lenis skill exists. If Lenis is ever added, drive it from GSAP's ticker and call `ScrollTrigger.update` on scroll. Native scroll is the default.
- The existing `motion/` pipeline and the falcon keyframes are out of scope (rule 0.1).

## Conflicts resolved at install time

- **VectorLab motion vs the cinematic brief.** Its motion rules allow only 100–300 ms, prefer CSS and ban ambient loops, which would forbid scroll storytelling. Only VectorLab's `anti-slop` was installed.
- **Three design-system skills** (Anthropic, cuellarfr, ui-ux-pro-max's sub-skill). Only Anthropic `design-system` was kept.
- **Four accessibility options** (Anthropic accessibility-review, cuellarfr accessibility-audit, Deque Axe, Addy Osmani). Kept `accessibility` (WCAG 2.2, code-level) and `ux-ui-audit` (measured). The project already has axe-core in Playwright.
- **Critique.** Kept `design-critique` and impeccable critique. The cuellarfr suite was dropped as a duplicate.
- **ui-ux-pro-max's preset palettes and font pairings.** They are template picks (for example Playfair + Inter), exactly what rule 0.4 forbids. Use the skill for its UX guidelines, the Astro and Three.js stack notes and chart guidance. Never let it choose fonts or colours.
- **impeccable's launcher.** It downloads a native binary and installs edit/stop hooks, so neither was installed. The skill's documented fallback applies: it reads `PRODUCT.md`/`DESIGN.md` directly when they exist. `impeccable live`, `generate`, `pin` and `hooks` need the launcher and are unavailable.
- **Lottie.** Chose LottieFiles' official `dotlottie-web` over a stale community skill. **Three.js**: chose CloudAI-X's ten focused skills over a single stale one.

## Local modifications to third-party files

- `ui-ux-pro-max/SKILL.md`: `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/` was replaced with `.claude/skills/ui-ux-pro-max/`, so commands run from the project root.
- `ux-ui-audit/SKILL.md`: the description was shortened from 1,534 to 836 characters to fit Claude Code's 1,024-character limit. The body is unchanged.
- `review-animations/SKILL.md`: `disable-model-invocation: true` was removed so the skill can act as the automatic motion QA gate. Without that change it only runs when invoked as `/review-animations`.

## Updating

Re-vet before updating any skill. Diff the upstream repo at a new commit against the one in `skills-lock.json` and re-run the security checks listed there. Never add a skill's hooks, MCP servers, install scripts or launchers without a separate review.
