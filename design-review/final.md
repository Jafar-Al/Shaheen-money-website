# Final review — The Feather Line

Date: 2026-10-01. Branch `redesign/feather-line`.
Screenshots: `design-review/before/` (the site before the redesign) and
`design-review/after/` (this build): every route, both languages, at
360, 390, 430, 768, 1024, 1440 and 1920 px, plus full-page captures at 390
and 1440. Reproduce with `node scripts/shots.mjs design-review/after --full`
against `npm run build && npm run preview`.

## Round two: the owner's notes

The owner asked for a calmer first screen, every screen size, the five
pages plus Media and the two documents, the app's screenshots, and plain
answers in place of the legal placeholders. What changed:

- **The first screen is calmer, and the same.** Same falcon, same flight,
  same map and routes. The blue app box with the QR code is gone; the land
  is a soft tone on the brand navy instead of hatching; the grid lines are
  gone; only the five corridor cities are named. The words sit on a quiet
  ground.
- **Every screen size.** Every page was checked for sideways scrolling at
  thirteen widths (320–1280 px) and the homepage on phones held sideways
  and at 3440 px. Fixed: the hero on a phone held sideways (its own layout;
  in Arabic the falcon moves left, so it never meets the headline), the
  headline on an ultra-wide screen (one line per sentence), the iPhone and
  Android pair (it ran off a 320 and a 390px screen on the Media page), the
  email address on Security at 320px, and the two pinned scenes, which now
  pin only if they fit the window (on a 1366 × 768 laptop "How it works"
  hid its foot for as long as it was pinned).
- **The pages.** Home ends on three steps (download the app, create your
  account, receive your first transfer) beside the iPhone and Android;
  About links the company profile; Media holds the logo, the artefacts, the
  app's screens and both documents in both languages.
- **The company profile and the pitch deck** are new: five A4 pages and
  eleven 16:9 slides, made of the site's own components and copy, printed
  to PDF in English and Arabic (`npm run docs`).
- **The app's screenshots.** The owner's renders of the home screen on
  iPhone and Android, cropped to the screen, now stand in the site's
  handset (home, Get the app, Media, both documents) and are downloadable
  from Media. The AI-made scene renders and the generated portrait were not
  used (no generated people, nothing that looks AI-made).
- **Plain answers instead of placeholders.** The legal-review flow and the
  draft banners are gone. The company is named as Bankey LLC, Washington,
  D.C. (from the owner, and the privacy policy's "Bankey LLC, doing
  business as Shaheen Money"); no licence is claimed. Safeguarding: Shaheen
  Money does not hold or own your money; it is a self-custodial wallet and
  only carries out your instructions. The digital dollar paragraph cites
  the GENIUS Act (Public Law 119-27, sections 4(a) and 4(e)). Fees: none on
  receiving, sending or paying.

## The questions

**Does the result still look like the old website with a new skin? — No.**
The old site was a navy page with a glowing blue globe behind the falcon,
a bold sans, rounded cards and, in production, yellow "CONTENT NEEDED"
boxes. The new one is built on a different idea: a quiet atlas on which
the falcon lands on Amman and its feathers become the routes, two
temperatures (Night for the digital world, Paper for cash and reading), an
editorial serif with one italic word per headline, hairlines and ledgers
instead of cards, slips and stamps for the honesty layer. The structure,
copy and functions are the same on purpose; nothing visual carried over
except the logo, the falcon and the globe, which the project rules keep.

**Does it still look like a generic fintech template? — No.**
No gradient blobs, glass, stock people, card grids, phone mockups with
invented numbers or blue-to-purple gradients. The look comes from things
only this company has: its falcon, its corridors, its own app (rebuilt from
the owner's screenshots, stamped *Illustrative*), Amman's coordinates, a
shop counter where cash changes hands.

**Does the hero create an immediate WOW moment? — Yes.**
The falcon flies in and lands on Amman; its five feathers draw out as routes
across the map to Toronto, New York, London, Paris and Berlin; a first
transfer runs down a route into the falcon. It is one continuous gesture of
about four seconds, then the page is calm. On a phone the same story is
composed for a tall screen, and for a wide one when the phone is on its side.

**Does the hero visual feel custom-made for Shaheen? — Yes.**
It is drawn from the mark itself (the routes start at the falcon's real
feather tips, computed from the logo's own paths) and from the company's
geography; it could not belong to anyone else.

**Does the website feel alive rather than dead? — Yes.**
Motion has six jobs (Draw, Land, Flip, Print, Packet, Temperature): routes
and feathers stroke in, sections land as they are reached, "How it works"
plays the app through a transfer as you scroll, the cash-out card turns
over while the page turns from Night to Paper, the receipt prints its rows,
figures count to their value once. All of it stops for reduced motion.

**Does every page feel like part of the same design system? — Yes.**
Every inner page opens with the same Paper hero and its own seeded feather;
the same ledgers, slips, stamps, mono footnotes and buttons run through
About, Business, Contact, Security, Media, Get the app, Legal, the blog, the
form result pages and the 404; even the share images and the download
dialog use it.

**Can someone immediately tell that serious design work went into this? — Yes.**
The details carry it: the Arabic display face chosen by specimen, the
italic word set per language, figures in mono with pulled-in punctuation,
numbered sources under every figure, the printed receipt, the perforated
slips, the falcon's feathers as routes.

**Does the redesign preserve the existing product, content and functionality? — Yes.**
Every route, anchor and redirect; all copy in both languages (headlines
gained their emphasis markers, the press kit's colour and type notes now
describe the new palette and fonts, and the new components brought a few
new labels, all in both languages); every source, date and honesty label;
both forms; the device-aware download; the language switch; sitemap,
canonicals, hreflang and share images; the legal pages. 166 site tests and
5 form tests pass against the production build.

### Also checked

- **Arabic looks designed, not translated:** Arabic has its own display face
  (Noto Naskh Arabic), its own emphasis (an accent underline, since Arabic
  has no italic), mirrored layouts with geography that does not mirror,
  mono labels replaced by the Arabic UI face, deeper line heights.
- **Mobile is composed, not squeezed:** the hero has its own tall map
  frame and a layout for a phone on its side; scenes become stacks that
  reveal in place; every page checked from 320 to 1280 px.
- **Known blemishes, not introduced by the redesign:** on a phone the
  globe's labels for Amman, Dubai and Mumbai overlap (they did before too;
  the globe is untouched by rule).

### For the owner to decide

- The Arabic privacy policy and terms show the English text, set left to
  right under their Arabic titles with a note that the document is in
  English. An Arabic translation can replace them whenever it exists.
- The company name, Bankey LLC (Washington, D.C.), is read from the owner's
  "بنك LLC" and the privacy policy; confirm the exact spelling.
- The store badges are drawn in the site's own style. Apple's and Google's
  marketing guidelines ask for their official badge artwork; swap it in if
  strict compliance matters at launch.
- The accessibility statement says motion is "kept to a minimum". The site
  now has more, purposeful motion (all of it off under reduced motion).
  Suggested: "Motion is used where it explains something, and all of it
  stops when your device asks for reduced motion." (Arabic to match.) The
  copy was not changed without your approval.
- The falcon and the globe were kept exactly as they are (project rules),
  although the brief proposed redrawing the falcon and replacing the globe.
  The hero is built around the existing falcon instead; changing either is
  a deliberate decision to make separately.

## Verified

| Check | How | Result |
| --- | --- | --- |
| No purple anywhere | `tests/palette.spec.ts`: every computed colour (elements, `::before`/`::after`/`::marker`, SVG fill/stroke/stops, shadows, gradients) and every stylesheet colour literal on all 26 pages, converted to sRGB, hue 255°–330° rejected; self-test injects `#7A3CFF` and must be caught | Pass, 26/26 + self-test |
| Retired `#1400FF` | `npm run lint:styles` | Not used by the site |
| No gradient text, glass, glow | `npm run lint:styles`; the hero's only gradient is a bottom fade for legibility | Pass |
| No stock or generated imagery | Every image on the site is the falcon, line art drawn in code, the atlas (Natural Earth data), the owner's own renders of the app's home screen, or app screens rebuilt from the owner's screenshots | Pass |
| Honesty labels and sources | Built pages compared with the pre-redesign build: *Illustrative*, *Example*, *Example corridors* and every source line present (more of them now: every app shard is stamped) | Pass |
| Cash-out temperature shift | Pinned scene: the slip flips from the app's code to the cash while the page turns from Night to Paper; on phones it happens once, in view | Pass |
| Accessibility | axe (WCAG 2.2 AA) on all 26 pages in both languages with reduced motion, and inside the pinned scene with full motion; Lighthouse accessibility 100 on every measured page; keyboard order follows the reading direction with a visible 2px focus ring; forced colours drop the art and keep text, borders and focus | Pass |
| Product and functionality | Every route and anchor, both forms end to end, the smart download per device, the language switch, store links, sitemap, hreflang, legal pages: 166 site tests and 5 form tests | Pass |
| Build gates | `tokens --check`, `lint:styles`, `astro check` (0 errors), `build`, `check:dist` (titles, canonicals, hreflang, links, CSP-safe markup, budgets) | Pass |

## Performance

Lighthouse 12, mobile emulation, median of three runs. "Before" is the
pre-redesign commit (`84bf627`), built and served the same way on the same
machine (local server with Brotli, as Vercel serves).

**Lighthouse default (slow 4G: 1.6 Mbps, 150 ms RTT, 4× CPU)**

| Page | Before: perf · FCP · LCP · CLS | After: perf · FCP · LCP · CLS |
| --- | --- | --- |
| `/en` | 99 · 1.21 s · 1.96 s · 0 | 96 · 2.10 s · 2.40 s · 0 |
| `/ar` | 98 · 1.66 s · 2.11 s · 0 | 96 · 2.03 s · 2.40 s · 0 |
| `/en/business` | 100 · 1.06 s · 1.81 s · 0 | 99 · 1.51 s · 1.95 s · 0 |
| `/ar/contact` | 99 · 1.36 s · 1.96 s · 0 | 99 · 1.58 s · 1.95 s · 0 |
| `/ar/about` | — | 99 · 1.58 s · 1.95 s · 0 |

**The brief's profile ("mid-tier mobile over 4G": 9 Mbps, 170 ms RTT, 4× CPU)**

| Page | Before LCP | After LCP |
| --- | --- | --- |
| `/en` | 1.71 s | **1.88 s** (perf 99) |
| `/ar` | 1.71 s | **1.88 s** (perf 99) |

**Desktop:** `/en` 100 (LCP 0.45 s → 0.49 s), `/ar` 100 (0.49 s → 0.52 s).

Every measured page: TBT 0 ms, CLS 0, accessibility 100; best practices and
SEO 100 where measured.
JavaScript at load on the homepage: 5.0 KB gzipped (3.0 KB before), in three
requests. Fonts: 4 files per locale (English 76.8 KB, Arabic 84.5 KB).

Against the budgets: LCP ≤ 2.0 s on 4G is met (1.88 s); on Lighthouse's
slow-4G default the homepage is 2.40 s, 0.44 s slower than before, because
the page now carries the atlas, the app and the scenes (the document is
138–143 KB compressed, against 71 KB). CLS < 0.02, INP (TBT 0) and the JS
and font budgets are met everywhere.

What was done to get there: the atlas is clipped to what a screen can see
and draws its coastline once (document 570 → 426 KB raw, before the CSS
moved inline); the headline
comes before the map in the source; motion set-up waits for the first
frame; one script per page instead of eight; CSS inlined and hashed into
each page's CSP; `content-visibility` on the homepage chapters; Arabic
preloads its body face (without it, font swaps measured CLS 0.10 on
`/ar/about`).
