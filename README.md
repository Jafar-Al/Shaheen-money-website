# Shaheen Money — website

> **بالعربي باختصار:** هذا هو الموقع الجديد لشاهين موني. الموقع كله خمس صفحات بالقائمة الرئيسية: الرئيسية، من نحن، الأعمال، المدونة، تواصل معنا، ومعها صفحة إعلام وهوية (الشعارات وملفات الشركة) وصفحة أمان بالفوتر. الصفحة الرئيسية بتخدم نوعين من الزوار: اللي بدو ينزّل التطبيق فوراً (الصقر بيطير وبيستقر بالنص، تحته سلوجن وزر تنزيل واحد بيعرف جهازك لحاله)، واللي بدو يقرأ أولاً (ليش شاهين، كيف بيشتغل، السحب النقدي، الشبكة على كرة أرضية حقيقية، الكلفة، والأسئلة الشائعة). الموقع كامل بالعربي والإنجليزي (`/ar` و`/en`)، وما في ولا رقم أو ادعاء عن الشركة إلا إذا انضاف مع مصدره بملف `src/data/facts.ts`. لتعرف شو ناقص قبل الإطلاق: `npm run check:launch`.

Astro 7 (static) on Vercel, Tailwind CSS 4, English and Arabic with full RTL. Built from the audit in
`shaheen-money-audit-EN.md` and the product owner's direction for the homepage.

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321/en  (forms work here)
npm run build        # production build into .vercel/output
npm run preview      # serves the build with Vercel's routing, headers and CSP emulated
```

Node 22.12+ (see `.nvmrc`). Copy `.env.example` to `.env` if you need any of the optional services locally.

## How the site is put together

| Where | What |
|---|---|
| `src/pages/[locale]/…` | Every page exists once and is built for `/en` and `/ar`. The page list is `src/i18n/config.ts` (`pages`): navigation, sitemap, OG images and the tests all derive from it. |
| `src/data/media.ts` | The press kit: brand files (checked to exist at build time) and the pitch deck / company profile slots. |
| `src/copy/*.ts` | All visitor-facing text, English and Arabic side by side. `defineCopy` makes the Arabic a type error if it drifts from the English. Register: warm Levantine for marketing, Modern Standard Arabic for security, pricing, forms and legal. |
| `src/data/facts.ts` | **The only place claims about the company live** (licence, fees, ratings, Connector numbers…). Every number must carry a source and an as-of date. Empty facts render nothing in production. |
| `src/data/stats.ts` | Third-party figures (World Bank, UN), each checked against its source. |
| `src/data/network-map.ts` | Cities and corridors on the hero atlas and the network globe. |
| `src/content/blog/`, `src/content/legal/` | Markdown. Same slug in `en/` and `ar/` = translations of each other. |
| `design/tokens.json` | The design system's values. `npm run tokens` regenerates `src/styles/tokens.css` and fails if any colour pair misses WCAG contrast or any colour is purple. **`docs/DESIGN.md`** explains the system (The Feather Line): the idea, colour, type, motion and the decisions behind them. |
| `src/config/` | Site constants (store links, socials), security headers, legacy redirects, the download link. |
| `src/lib/forms/` | The form endpoints' server side: strict schemas, rate limiting, delivery. |

### Preview the gaps

`npm run dev` (or any build with `PUBLIC_SHOW_CONTENT_GAPS=true`) shows a dashed "Content needed" box everywhere a fact or document is missing, saying what is needed and where it goes. Production builds never show them: the section is simply left out.

## The site is five pages

| In the navigation | What it is |
|---|---|
| `/` | The landing page. Serves both visitors (below). |
| `/about` | The story (Bankey → Empowch → Shaheen), the mission, the principles, leadership. |
| `/business` | One page, two audiences: shops becoming Connectors, and companies, banks, wallets and payment providers connecting to the network. Both end at `/business/apply`. |
| `/blog` | The posts. |
| `/contact` | The form, the channels, and where press and business enquiries go. |

Plus, from the footer only: `/media` (logos, brand rules, colour, type, company documents), `/security`, `/get-the-app`, `/accessibility` and the legal documents.

What used to be `/how-it-works`, `/cash-out`, `/coverage`, `/pricing` and `/help` are now sections of the homepage, each with a stable id (`#how`, `#cash-out`, `#network`, `#pricing`, `#faq`), and each old URL 301s to its section (`src/config/redirects.mjs`). `/connectors` and `/connectors/apply` 301 to `/business` and `/business/apply`.

The header is four plain links and one action. There are no dropdown panels left, so there is no menu JavaScript on a desktop and nothing to trap focus in.

### The homepage

It serves two visitors (the product owner's brief), and the first never has to scroll past anything belonging to the second:

1. **The one who came to download.** The Shaheen falcon flies in and lands on Amman on an engraved atlas, and its feathers run out as routes to the cities people send from (`src/components/home/Hero.astro`, `HeroAtlas.astro`; the atlas is drawn at build time from `src/lib/atlas.ts`). The falcon animation itself is untouched (`FalconFlight.astro`). Over it, the slogan, one line saying what this is, and **one download button** that knows the device: iPhone/iPad → App Store, Android → Google Play, computer → a QR code to scan with the phone. Beside it, a quieter control for the second visitor. The real app, rebuilt from the owner's screenshots and stamped *Illustrative*, sits in the corner with its balance counting up.
2. **The one who wants to understand first.** Numbered chapters, in the order people ask: why Shaheen (sourced figures), how it works (a pinned scene that walks the app through a transfer), cash out (the card flips from the app's code to the cash, and the page turns from Night to Paper), the network, what it costs, the questions we are asked most, the latest posts, and the download. Chapters whose content does not exist yet (customer voices) do not render, and the numbering follows.

The design system behind it (The Feather Line) is written up in **`docs/DESIGN.md`**: two temperatures (Night for the digital world, Paper for cash and reading), Instrument Serif with one italic word per headline, Noto Naskh Arabic chosen by specimen, hairlines instead of cards, and motion in six verbs built on CSS and a few small modules in `src/lib/motion/` (no animation library). Sections land as they are reached, built so content can never be stranded invisible: only an element the script has *started observing* is hidden, and a timeout clears anything still pending after four seconds. Reduced motion shows every final state.

The universal download link is **`https://shaheen.money/download`** — use it on posters, in Connector shops and in QR codes. The edge sends phones to their store and everyone else to `/en/get-the-app` (or `/ar/download` → `/ar/get-the-app`), and answers `Vary: User-Agent` so no shared cache serves one device's answer to another.

The device is decided in exactly one place: the inline script in `src/layouts/BaseLayout.astro`, which runs before first paint so the button's label never shifts. `src/scripts/smart-download.ts` reads that answer off `<html data-platform>` rather than working it out again, so the label a visitor sees and the store the link opens cannot disagree. iPadOS reports itself as a Mac, so the test is `maxTouchPoints > 0`: a Mac reports 0 and every iPad reports 5, and the expensive mistake is telling someone holding an iPad to scan a QR code with their phone.

### The films

`motion/` holds three ten-second motion-graphics films, each a single
self-contained HTML file rendered to a 1920×1080 60fps MP4, all in the
brand palette.

| | Film | What the motion is *for* |
|---|---|---|
| **01** | **The journey** | What the app does, silently, in ten seconds: money travels one unbroken line through four stops, and the four then collapse into one app. |
| **02** | **Pour** | Money arriving and gathering — one balance filling one wallet. |
| **03** | **Swarm** | Connectors are people, not machines: thousands of separate points that only mean something together. |

The rule they are built on is that **every movement has to carry
information**; if a thing moves and the viewer learns nothing from it
moving, it comes out. In film 01 that is the structure: there is exactly one
moving object, and every other movement on screen is a consequence of it
arriving somewhere. Stations do not pop on a timer — each lights at the
moment the money reaches it, cued off the path's own arc length — and the
closing move is the sentence *four steps, one app* said without words.

Colour follows the same contrast rules as the site: cyan on navy only,
brand blue on white only (the icons inside the white station discs), white
on navy. Cyan on white and blue on navy both fail, and the token build
refuses both.

```bash
npm run motion            # all three into motion/out/
npm run motion:preview    # 12fps, for a fast look
```

Frames are *stepped*, not recorded: each scene exposes
`renderFrame(seconds)` which sets the whole stage for that instant and keeps
no state, so there are no dropped frames and the same bytes come out every
time. Nothing is random either — every scatter comes from a seeded
generator. The mark is never redrawn: `motion/lib/falcon.js` is generated
from `src/assets/brand/falcon.svg`, and film 03 rasterises that path to
place each of its particles, so the swarm resolves into the real mark to the
pixel. See `motion/README.md`.

### The press kit

`npm run media` regenerates `public/media/` from the one vector master (`src/assets/brand/falcon.svg`), so the files a journalist downloads and the mark the site renders cannot drift apart. `src/data/media.ts` reads each file's real size off disk and **fails the build if a listed file is missing**. To publish the pitch deck or the company profile, drop the PDF into `public/media/` and set its `file` there; until then the slot shows a "content needed" marker in dev and nothing in production.

## Quality gates

`npm run verify` runs them all locally; CI (`.github/workflows/ci.yml`) runs them on every pull request.

| Command | Checks |
|---|---|
| `npm run tokens -- --check` | Tokens are current; every colour pair meets its WCAG threshold; banned pairs (cyan on white, blue on navy) still fail. |
| `npm run lint:styles` | No arbitrary Tailwind values, no physical left/right utilities (RTL), only the 2px and pill radii and the one paper shadow, no glass, no gradient text, no Signal cyan on Paper, never the retired `#1400FF`, no em dashes in Arabic copy. |
| `npm run check` | TypeScript, strictest. |
| `npm run check:dist` | On the built HTML: lang/dir, unique titles, descriptions, absolute canonicals, reciprocal hreflang with x-default, an OG image that exists for every page, alt + width + height on every image, no inline handlers/`style=`/`javascript:`, every internal link resolves, store links match the allow-list, the old fake "live" counter can never return, and budgets (images, CSS, JS, fonts per locale). |
| `npm test` | Playwright: axe WCAG 2.2 AA on every page in both languages, no horizontal overflow at 320/390/768/1024/1440, first-party requests only and no cookies, no CSP violations, security headers, language switch keeps the page, skip link, mobile menu focus handling, the smart download on iPhone/Android/desktop, the falcon ending at rest, the hero headline never hidden behind an entrance, axe inside the pinned scene with full motion, **no purple anywhere** (every computed colour and stylesheet colour on every page, with a self-test), and the forms end to end. Locally: `PW_CHANNEL=msedge npm test` uses an installed browser. |
| Lighthouse CI | Mobile on a 4G profile (9 Mbps, 170 ms RTT, 4× CPU; the brief's "mid-tier mobile over 4G"): LCP ≤ 2.0 s, CLS < 0.02, TBT < 200 ms, page < 500 KB, images < 150 KB, JS < 120 KB, CSS < 40 KB, fonts < 120 KB, zero third parties. Measured numbers, before and after the redesign, are in `design-review/final.md`. |
| `npm run check:launch` | What the company must still supply (see below). Runs on `main` in CI. |

## Before launch

Run `npm run check:launch`. Today it lists, among others:

- registered entity, licence/regulator, how customer funds are held, what backs a digital dollar;
- the fee schedule (the homepage's "What it costs" section claims nothing without it);
- the pitch deck and the company profile as PDFs, for `/media` and `/business`;
- the privacy policy and terms: run `npm run import:legacy` to migrate them and the 11 blog posts from the current site, then have legal review them (the audit found the privacy policy names no data controller) and set `status: approved`;
- form delivery on Vercel: `FORMS_WEBHOOK_URL` (+ `FORMS_WEBHOOK_SECRET`) and/or `RESEND_API_KEY` + `FORMS_EMAIL_TO` + `FORMS_EMAIL_FROM`.

Recommended: Upstash Redis for shared rate limits, Cloudflare Turnstile on the forms, real photography and ratings, and a vector master of the falcon (the current SVG is traced from the 239 px PNG).

## Deploying on Vercel

Import the repository; the Astro preset runs `npm run build`, which also writes the security headers and the `/download` routing into `.vercel/output/config.json` (`scripts/postbuild.mjs`). Preview deployments are automatically `noindex`. Every legacy URL (`/about`, `/home-arabic`, `/privacy-policy-ar`, `/blog/<slug>` …) redirects into the new tree (`src/config/redirects.mjs`).

## Where this differs from the audit, and why

- **CSP is hash-based, per page, as a header** — Astro computes the hashes and the Vercel adapter sends them. The audit's `nonce-{NONCE}` in a static `vercel.json` would never be substituted and would block every script.
- **HSTS `includeSubDomains; preload` is behind a flag** (`src/config/headers.mjs`): it cannot be withdrawn for two years, so confirm every subdomain serves HTTPS first.
- **`line-strong` border is 50% navy, not the audit's 32%**, which composites to ~2.2:1 and fails WCAG 1.4.11. The token build proves 3.52:1.
- **Smallest button is 44 px, not 40 px** — the audit also sets 44 px as the minimum target.
- **Hero** follows the product owner's direction (falcon, one slogan, one smart button) rather than the audit's eyebrow/subhead layout; the audit's evidence row is kept and appears when its facts exist.
- **No persona photos, no invented app screens.** The legacy persona images look generated, and the brief was "no AI look". The app appears only as rebuilt from the owner's own screenshots, in HTML, stamped *Illustrative*, with one consistent set of example amounts. Real photography can be added through `src/components/media/Photo.astro` (AVIF/WebP, sizes, dimensions enforced).
- **Analytics is off by default** and cookieless when enabled (`PUBLIC_ANALYTICS_*`), so no consent banner is needed.

## Scripts that touch brand files

`scripts/brand/trace-logo.mjs` (falcon PNG → SVG, needs `npx -p potrace@2`), `npm run icons` (favicons and app icons from the SVG), `npm run media` (the press-kit files in `public/media/`), `npm run fonts` (vendors and subsets the web fonts; English pages load 4 files / 76.8 KB, Arabic 4 files / 84.5 KB). Original downloads are kept in `brand-source/`.
