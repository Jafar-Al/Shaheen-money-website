# Shaheen Money — The Feather Line

The design system behind shaheen.money since the October 2026 redesign. It
says what the site is trying to feel like, the rules that make it so, and the
decisions that are not obvious from the code. Values live in
`design/tokens.json`; this file explains them.

## The idea

**The falcon lands on Amman, and its feathers become the routes.** The hero
is a quiet atlas (the land a soft tone on the brand navy, only the corridor
cities named); the Shaheen falcon flies in and lands on the city, and
each of its feathers runs out as a route to a city people send from. The
same feather, drawn as a hairline engraving, recurs across the site: a strip
across the top of every inner page, a cover for every blog post, a plume in
the footer, a route that runs out to nowhere on the 404.

**Two temperatures.** *Night* is the digital world: the wallet, the network,
the app. *Paper* is the physical world: cash in a hand, a receipt, the shop
round the corner, and every page you read. The homepage moves between them
as its story moves from a transfer abroad to cash in your hand; the header
takes the temperature of whatever is under it.

**Honesty as an object.** What the site cannot yet prove is marked, and the
marks are designed, not apologetic: a rubber stamp for *Illustrative*,
*Example corridors* and *Note*; numbered mono footnotes with a dated source
under every figure; the app shown as it is (the owner's own screenshots, or
screens rebuilt from them), never invented. A figure without a source cannot render
(`src/data/facts.ts`, `Sourced<T>`).

**What it refuses.** Stock photography, generated people, mock screens with
invented data, glass, glow, gradient text, bento and card grids, marquees,
particles, shield/globe/coin icons, and purple.

## Colour

| Token | Value | Role |
| --- | --- | --- |
| `night-950` | `#04070F` | deepest Night, under the header strip |
| `night-900` | `#060B1C` | Night ground |
| `navy-800` | `#071138` | the brand navy: the mark, ink on Paper, bands |
| `night-700` | `#101A3A` | raised surfaces on Night |
| `paper-50` | `#F6F1E7` | Paper ground |
| `paper-100` | `#EFE8DA` | raised surfaces on Paper |
| `paper-200` | `#E3DAC7` | Paper hairlines and wells |
| `signal` | `#00E1FF` | the live accent — **Night only**, sparingly |
| `signal-ink` | `#006E86` | the accent on Paper |
| `amber` | `#F5A623` | physical cash, on Night |
| `amber-ink` | `#8A5300` | cash on Paper |
| `error` | `#C2410C` | form errors |

Text on each ground is a set of opacities of one colour (chalk on Night,
ink on Paper), so hierarchy never introduces a new hue. The `app-*` colours
(`#0701FC`, `#1E3AED`, `#031535`, `#04DCFA`, `#193655`) are sampled from
the real app and appear only where the app is shown (the phones, the film).

Rules, each enforced by a check rather than by memory:

- **No purple.** No colour may sit between 255° and 330° of hue unless it is
  effectively grey. `scripts/build-tokens.mjs` refuses such a token;
  `tests/palette.spec.ts` converts every computed colour on every page (and
  every colour literal in the stylesheets, hover and focus states included)
  to sRGB and fails on one, and it carries a self-test that proves it
  catches purple.
- **The old electric blue `#1400FF` is retired** (it read violet beside the
  navy). `scripts/lint-styles.mjs` rejects it anywhere.
- **Signal stays on Night.** It is 1.4:1 on Paper. The lint rejects
  `*-signal` utilities outside a Night context; the one exemption (the press
  kit's Signal swatch, which has to show the colour) is marked in the code
  with its reason.
- **Contrast.** Every text/ground pair in the tokens is checked at build
  (≥4.5:1 for text, with the failing pairs listed as banned), and axe runs
  on every page in both languages in `tests/a11y.spec.ts`.

Surfaces are separated by hairlines, not shadows. Radius is `2px` for panels
and a full pill for buttons and chips; there is no other. The only shadow is
the *paper shadow* under a slip, because a slip is a piece of paper lying on
the page. A static grain sits on the grounds; nothing is blurred.

## Type

| Role | Latin | Arabic |
| --- | --- | --- |
| Display | Instrument Serif 400 + italic | Noto Naskh Arabic 500 |
| Interface and body | Instrument Sans (variable) | IBM Plex Sans Arabic 400, 600 |
| Figures, codes, dates, sources, labels | Geist Mono 400 | Geist Mono 400 |

- **One emphasised word per display headline.** Copy marks it with
  asterisks (`costs *too much.*`), chosen per language by whoever writes the
  line; `src/components/ui/Emph.astro` sets it in the serif's italic. Arabic
  has no italic: the emphasised words carry an accent underline instead
  (`.emph`), and Arabic is never letter-spaced.
- Money reads the same in both languages: figures are always Geist Mono with
  tabular numerals, and the decimal point and thousands comma are pulled in
  (`src/lib/figure.ts`) so large numbers do not gap.
- Fluid scale (`display-xl` `clamp(3.5rem, 9.5vw, 9.5rem)` down to
  `micro`), with Arabic line-heights and a scale factor per step
  (`rtlLineHeight`, `rtlScale` in the tokens).
- **Budget: four font files per locale.** English pages load Instrument
  Serif (roman, italic), Instrument Sans and Geist Mono; Arabic pages load
  Noto Naskh Arabic, Plex 400 and 600, and Geist Mono. Every file is subset
  to the characters the site renders (`scripts/build-fonts.mjs`). The two
  pages that set both scripts, the press kit's type specimens and the
  bilingual 404, carry both sets (`<html data-fonts="both">`); unicode-range
  keeps a face from loading until a glyph needs it. `npm run check:dist`
  enforces all of this.

### The Arabic display face

Chosen by specimen, not by habit. `docs/specimens/arabic-display-specimen.jpg`
sets the hero line (*أموالك بلا حدود. وصولك بلا قيود.*) at display, heading
and body sizes in El Messiri 500/600, Noto Naskh Arabic 500/600, Amiri
400/700 and Reem Kufi 500/600, beside Instrument Serif, on Paper and on
Night. The brief's test: the same editorial voice as Instrument Serif, thin
strokes that stay legible on Night, nothing that looks dated, and a weight
that matches a light serif (500–600, never 700+).

- **Reem Kufi** is a geometric Kufi: striking as a logo, but it shouts next
  to a light serif, and its closed counters clog at heading sizes.
- **El Messiri** is contemporary but nearly monoline; beside Instrument
  Serif it reads as a sans and loses the engraved feel.
- **Amiri** has the most calligraphic voice, but it is a book face: its
  400 is lighter than everything around it, its 700 overshoots the serif,
  and its tall ascenders and deep descenders need very loose leading.
- **Noto Naskh Arabic 500** has a modulated stroke that answers Instrument
  Serif's contrast at a matching weight, a contemporary drawing, compact
  vertical metrics (it sets at 1.3 line-height at display sizes), and its
  thin strokes hold on Night. Subset, it is 10.8 KB.

Interface and body stay in IBM Plex Sans Arabic, which also carries the
Latin inside Arabic text (brand and store names) so they match. Plex is
vendored under `brand-source/fonts/ibm-plex-sans-arabic/` rather than
installed from IBM's npm package, whose install script sends telemetry.

## Layout

A 12-column grid inside `--margin` (`clamp(20px, 6vw, 96px)`) with a 24px
gutter. Vertical rhythm has three steps (`section-dense`, `section`,
`section-airy`). The homepage is a sequence of numbered chapters
(`01/08 Why Shaheen?`), each opening with a mono kicker and a display
headline. Lists are ledgers: numbered rows between hairlines, never cards.
Paper things that would be a card elsewhere are *slips*: a perforated sheet
with a mono serial number and a paper shadow, sometimes stamped.

Arabic is first-class: every layout uses logical properties and mirrors as a
whole; the plume on the inner pages points the way the page reads. Geography
never mirrors: the map, the routes and the falcon keep their real positions
in Arabic, and only the legibility mask moves to the other side.

## Components

| Component | What it is |
| --- | --- |
| `home/Hero`, `home/HeroAtlas` | Equal Earth atlas (d3-geo, world-atlas 110m): the land a soft tone on navy, no grid lines; the five feather routes to Toronto, New York, London, Paris and Berlin, and, around Amman, the nine Arab capitals (Damascus, Beirut, Amman, Jerusalem, Cairo, Riyadh, Doha, Abu Dhabi, Dubai) named in the page's language, with a real great-circle line from Amman to each of the five that are far from it. Three compositions: wide (Amman at 66% in English, where the words are on the left; a third of the way across in Arabic, where they are on the right, so the Gulf's capitals sit clear of the headline: the map itself never mirrors), tall (phones: fewer names, since the Levant three sit under the falcon and Abu Dhabi's would land on Riyadh's; on a short phone only Cairo's stays), and a phone on its side (no capitals: the map is a few hundred pixels tall there) (Amman moved to the far side, the left in Arabic, so the headline never meets the falcon) |
| `art/FeatherField` | seeded hairline feathers (`src/lib/feather.ts`): `strip`, `cover`, `corner`, `single` (+ `trail` on the 404) |
| `art/ShopCounter`, `art/Rails` | line drawings for the cash-out shop and the partner rails |
| `app/AppIcon` | the app icon |
| `media/Film` | the owner's ten-second film as a quiet inline player: silent, looping, playing only while on screen and never under reduced motion or Data Saver, with a pause button; nothing is fetched until it plays |
| `app/Device` | the owner's own renders of the home screen (iPhone and Android, `src/assets/app/`) in the site's handset: one phone, or the pair, sized so both phones fit any column down to a 320px screen; stamped *Illustrative* |
| `layouts/PrintLayout`, `pages/[locale]/media/company-profile`, `…/pitch-deck` | the company profile (A4, five pages) and the pitch deck (16:9, eleven slides), made of the site's own components and copy and printed to PDF by `npm run docs` |
| `ui/Chapter`, `ui/PageHero` | the homepage chapter frame; the inner-page hero with its feather strip |
| `ui/Slip`, `ui/Stamp` | the paper slip; the rubber stamp (Illustrative, Example, Example corridors, Sourced, Note) |
| `ui/Figure`, `ui/SourceNote`, `ui/FootnoteRef` | a sourced statistic, counted up once, with its numbered, dated source |
| `ui/Ledger`, `ui/IndexRow` | numbered rows between hairlines; index rows for posts, documents and doors |
| `ui/Accordion` | native `details`/`summary`, animated with `::details-content` |
| `ui/Button`, `ui/TextLink` | pill buttons (solid is the temperature's inverse, never blue) and underlined text links |
| `ui/Gap` | a dev-only marker for missing content (`?todo=1`); production renders nothing |
| `site/Header`, `site/Footer`, `site/LocaleSwitch` | header that takes the temperature under it; footer with the plume and the official-links slip; the EN / ع segmented switch |

## Motion

Five verbs, each with one job, and the film:

- **Draw** — hairlines stroke themselves in once (routes, feathers, the shop).
- **Land** — groups arrive as they scroll into view, children in order.
- **Print** — a stamp lands in one step, the way a stamp does, and a receipt prints its rows.
- **Packet** — a single signal dash runs a route, one route at a time.
- **Temperature** — the page turns from Night to Paper at a plain edge, and
  the header takes the temperature of whatever is under it.

The homepage no longer pins or scrubs anything: the owner found the first
version crowded, and the film now does what the pinned "How it works" scene
did, with less. It is built on CSS and small modules in `src/lib/motion/`
(level, reveal, scenes, count, pointer): a few KB of JavaScript on the
homepage, gzipped. There is no GSAP. Scrolling is native.

- `prefers-reduced-motion` is honoured everywhere: everything goes to its
  final frame (routes drawn, balance at its value, cards unflipped), and
  150 ms opacity fades remain so the interface still answers.
  `html[data-motion]` (`reduced`, `lite`, `full`) is set before first paint.
- Content can never be left invisible: only an element the reveal script is
  watching is hidden, and a four-second rescue reveals anything still
  pending.
- The film (`src/scripts/home/film.ts`) plays only while 40% of it is on
  screen, is always silent on the page, stays paused once the visitor has
  paused it, and waits on its poster under reduced motion and Data Saver.
- Draw-in strokes scale with their drawing. Under `non-scaling-stroke`,
  Chromium measures dashes in screen pixels, so a `pathLength` draw stops
  short on any drawing shown above 1:1 (the hero's routes stopped short of
  their cities on screens wider than about 1600px).
- Language switching uses cross-document View Transitions (none under
  reduced motion).

## Decisions worth knowing

- **The falcon, the globe and the logo are untouched.** The brief proposed
  redrawing the falcon and replacing the globe; the project rules
  (`CLAUDE.md`) keep all three exactly as they are. So the new hero is built
  *around* the falcon: the atlas behind it is new, the falcon's own flight
  lands it on Amman, and its feathers become the routes. The globe keeps its
  drawing and animation and is shown as a Night plate in the Network
  chapter, with city chips that highlight its corridors. If the owner wants
  the brief's version (a redrawn falcon, no globe), that is a separate,
  deliberate change to those rules.
- **The app is shown, never mocked.** The phones (`app/Device`) show the
  owner's own renders of the home screen, cropped to the screen. The cash
  slip shows the example $200.00 and code 482 719 and is stamped
  *Illustrative*. One of the owner's AI-made scene renders (the phone on a
  blue landscape, no face, no invented names) is on the homepage's closing
  section, at the owner's request on 1 October 2026; the others, which
  carry a generated portrait and invented names, are not used.
- **Simple on purpose.** The owner found the first redesign crowded and hard
  to follow. The homepage went from nine chapters and about 19,000 px (1440
  wide) to six sections and about 9,000 px: how it works (with the film),
  cash out, what it costs, the network, the questions, the download. Gone:
  the cost ruler, the receipt example, the calculator and comparison table,
  the three pinned or scrubbed scenes, the city list, the question filter,
  the blog teaser and the audiences list. Each section says one thing in a
  sentence or two; longer material has its own page. The download button
  says "Download the app" on every device and goes straight to the right
  store, so the visitor never has to choose.
- **Every screen size.** Every page is checked for sideways scrolling at
  thirteen widths from 320 to 1280 px (desktop emulation, which does not
  hide overflow the way phone emulation can), and the homepage on phones
  held sideways and at 3440 px. The hero has a layout for a phone on its
  side, and its headline is capped so an ultra-wide screen still sets each
  sentence on one line.
- **The documents are the website.** The company profile and the pitch deck
  are pages of the site (noindex) built from its components and copy
  (`src/copy/docs.ts` plus the shared copy), so they cannot drift from it.
  `npm run build && npm run docs && npm run build` prints them, in both
  languages, to `public/media/` and ships them on the Media page.
- **The hero headline is the largest paint.** It is not faded in, and the
  map's bytes come after it in the HTML; the atlas is clipped to what any
  screen can see and draws its coastline once.
- **Share images** (`src/lib/og.ts`) are built at build time in the same
  language: the page's own feather (same seed), its title with the italic
  word, the lockup on a hairline, mirrored for Arabic.
- **Speed is part of the design.** The homepage's chapters skip rendering
  until they come near (`content-visibility`), CSS travels inside each page
  (hashed into its CSP, so nothing blocks the first paint), each page makes
  one script request for its behaviour, and motion is set up after the first
  frame. Measured with Lighthouse 12 (median of three): the homepage's LCP is
  1.88 s on the brief's 4G profile (9 Mbps, 170 ms, 4× CPU) and 2.40 s on
  Lighthouse's slow-4G default; inner pages 1.95 s on slow 4G; CLS 0 and TBT
  0 throughout. Full numbers, before and after: `design-review/final.md`.
- **Arabic preloads its body face as well as its display face**, against
  the brief's "preload the display face only": Arabic system fonts wrap
  differently from IBM Plex even with metric-adjusted fallbacks, and the late
  swap measured CLS 0.10 on `/ar/about`. With Plex 400 preloaded it is 0.
- **Missing content never ships as a placeholder.** `Gap` markers are
  visible only in development or with `?todo=1`; every build prints the
  list of what is still needed (`integrations/content-gaps.mjs`,
  `npm run check:launch`).

## Checks

| Command | What it guards |
| --- | --- |
| `npm run tokens -- --check` | tokens.css matches tokens.json; contrast pairs; no purple token |
| `npm run lint:styles` | radius, shadow, glass, Signal on Paper, the retired blue, Arabic em dashes |
| `npm run check` | types across Astro and TypeScript |
| `npm run build` | the site, share images, edge rules and per-page CSP |
| `npm run check:dist` | titles, descriptions, canonicals, hreflang, links, CSP-safe markup, image, CSS, JS and font budgets |
| `npm test` | overflow at five widths, privacy (no third-party requests or cookies), CSP, headers, language switch, keyboard, the download button per device, the hero, axe on every page, the purple scan, the forms |
