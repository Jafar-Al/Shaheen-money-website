# Shaheen Money — agent notes

## Design skills

Before any design, UI, motion or visual-QA work, read `.claude/skills-architecture.md`. It says which skill leads each layer and how their conflicts are resolved. Skill sources and the security review are in `.claude/skills-lock.json`.

Non-negotiables, whatever a skill suggests:

- The falcon (`src/components/home/FalconFlight.astro`), the globe (`src/components/home/Globe.astro`) and the logo stay exactly as they are: same drawing, style, keyframes and proportions.
- The stack is Astro + Tailwind v4. Do not add React or R3F.
- `design/tokens.json` is the source for colour, type, spacing and motion tokens.
- Nothing may look AI-generated: no stock heroes, no generated people, no mock app screens with invented data.
- Arabic/RTL is first-class. Use logical CSS properties and never letter-space Arabic.
- Respect `prefers-reduced-motion` on every animation.

## The design system

The site's visual language is The Feather Line (October 2026). Read `docs/DESIGN.md` before UI work: Night and Paper temperatures, one italic word per display headline (`*word*` in the copy), slips, stamps and ledgers instead of cards, motion in `src/lib/motion/`.

- No purple anywhere (hue 255°–330°). `npm run tokens` and `tests/palette.spec.ts` enforce it; the old `#1400FF` is retired.
- Signal cyan (`#00E1FF`) is for Night only; on Paper the accent is `signal-ink`.
- Radius is 2px or a pill; the only shadow is the paper shadow under a slip; no glass, glow or gradient text.
- No inline `style=""` (the CSP forbids it); set custom properties through CSSOM.
- Homepage chapters use `.cv-auto` (content-visibility); full-page screenshots must render them first (`scripts/shots.mjs` does).
