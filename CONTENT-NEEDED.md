# What the website still needs from the company

> **بالعربي:** هذا الملف فيه كل إشي ناقص للموقع، ولشو بينستخدم، وبأي شكل لازم يوصل.
> عبّي الخانات وابعتها، وكل وحدة بتتحط بمكانها وبيرجع القسم يظهر.
> لتشوف القائمة محدّثة بأي وقت: `npm run check:launch`

Every claim on this site carries a source and a date, or it is not published.
An empty slot below does not show a placeholder — **the section that depends on
it is left out of the page entirely.** For exactly this reason the homepage has
no "People who use Shaheen Money" chapter today, and the strip at the top of
every page carries only the self-custody line until the licence and the store
ratings exist.

Each row says where the fact appears and what happens without it. The `field`
column is the exact place it goes in `src/data/facts.ts`, so whoever fills this
in and whoever edits the code are talking about the same thing.

---

## 1. Blockers and the trust layer

### 1.1 Form delivery — the one blocker left (a setting, not content)

Without one of these the contact and business forms answer "temporarily
unavailable" and nothing reaches you.

In **Vercel → Settings → Environment Variables**, either:
- `FORMS_WEBHOOK_URL` (+ `FORMS_WEBHOOK_SECRET`) — sends submissions to a CRM,
  ticketing system, Slack, Make or Zapier; or
- `RESEND_API_KEY` + `FORMS_EMAIL_TO` + `FORMS_EMAIL_FROM` — sends them by email.

Both is fine, and safer.

### 1.2 Filled in on 1 October 2026 — please check

From the owner's answers. Each is in `src/data/facts.ts` with its source and
date; change the wording there and every page and both PDFs follow.

| What | What the site says now | field |
|---|---|---|
| The company | **Bankey LLC**, Washington, D.C., United States. Read from "شاهين موني مرخصة من بنك LLC بواشنطن" and the privacy policy's "Bankey LLC, doing business as Shaheen Money": **confirm the spelling.** No registration number or address is shown; none was wanted. | `company.legalName`, `company.jurisdiction` |
| Licence | None is claimed, so the licence lines stay hidden. If one is ever published, add it (regulator, type, number, public register URL) and the trust strip and `/security` show it. | `licences` |
| How money is held | Shaheen Money does not hold your money and does not own it: a self-custodial, decentralised wallet, the balance under your own control, Shaheen only carrying out your instructions. | `safeguarding` |
| What a digital dollar is | One paragraph: a stablecoin designed to keep a value of one US dollar; under the GENIUS Act (July 2025) a permitted issuer backs it at least 1:1 with reserves, publishes their make-up monthly and has that report examined monthly; not a bank deposit, not FDIC-insured, not issued by Shaheen Money. Source: GENIUS Act, US Public Law 119-27, sections 4(a) and 4(e). | `digitalDollar` |
| Fees | Receiving, sending, paying: no fee. Nothing else is listed. | `pricing.schedule` |
| Legal documents | No legal-review step and no draft banners: `/legal/privacy`, `/legal/terms` and `/legal/cookies` show the documents as they are. In Arabic, the privacy policy and terms show the English text, marked as English, until an Arabic translation exists (`src/content/legal/ar/`). | `src/content/legal/` |

---

## 2. Important — each one brings a section back

### 2.1 The Connector programme

`/business` is the page that recruits shops. Its economics are the highest-value
missing content on the site: a shop owner will not apply without knowing what
they earn.

| What | field | Appears | Your answer |
|---|---|---|---|
| *(Optional)* What a Connector earns per cash-out, if you want it stated. Shaheen's own commission is zero, and the site says only that; it states nothing about what shops earn until this is filled | `connectorProgram.commissionPercent` + `.source.asOf` | Homepage network band + `/business` | |
| Who can apply — registration, fixed premises, opening hours, cash on hand, per country | `connectorProgram.eligibility` | `/business` | |

### 2.2 Network figures

Appears beside the globe on the homepage. **Nothing here may be called "live"**
unless it is fetched at request time — the current site shows a hardcoded
"$1.2M moved today" that never changes, which is why this site refuses to print
a number without a date.

| What | field | Your answer |
|---|---|---|
| Active Connectors | `network.activeConnectors` | |
| Countries live | `network.countries` | |
| As-of month, and where the figure comes from | `.source` | |

### 2.3 Proof — **this whole section is missing from the live site today**

"People who use Shaheen Money" does not exist on the homepage right now because
all three inputs are empty.

| What | field | Your answer |
|---|---|---|
| App Store rating + number of reviews + date checked | `ratings.ios` | |
| Google Play rating + number of reviews + date checked | `ratings.android` | |
| 2–3 testimonials: real name, location, quote, **and the date written consent was recorded** | `testimonials` | |
| One Connector's story: name, shop, city, photo, consent date | `connectorStory` | |
| Any press coverage: outlet, headline, URL, date | `press` | |

### 2.4 Coverage

| What | field | Appears | Your answer |
|---|---|---|---|
| Verified country list — where people can receive, where they can cash out | `coverage` | Homepage FAQ, and unlocks a published list instead of "ask us" | |

### 2.5 Minimum cash-out

| What | field | Appears | Your answer |
|---|---|---|---|
| Smallest amount someone can withdraw, in USD, + date | `pricing.minCashOutUsd` | Homepage *Cash out* section and the evidence row under the download button | |

### 2.6 Price comparison

Appears in *What it costs*. The strongest argument on the page, and the one that
needs the most care: figures must be real, dated, and checked.

| What | field | Your answer |
|---|---|---|
| A named corridor and amount, e.g. "Berlin → Amman, $300" | `pricing.comparison.corridor` | |
| For Shaheen and for 2–3 alternatives: upfront fee + exchange-rate margin % | `pricing.comparison.rows` | |
| Where each competitor figure was taken from, and when | `.source` | |

### 2.7 Leadership

No founder photo is needed: the About page shows the founder's name, role and quote, and
nothing else. (A photo is optional; if one is added it goes in `team[].photo`, with consent.)

| What | field | Appears | Your answer |
|---|---|---|---|
| His name in Arabic, spelled the way he writes it | `team[].nameAr` | `/about`, `/media` | |
| Confirm the founder quote on `/about` is still what he wants to say — it is the wording from the current site | copy | `/about` | |

---

## 3. Files and images

Drop each file where the table says and it is picked up automatically. The build
**fails** if a listed file is missing, so a download link on this site cannot
quietly rot.

| File | Put it in | Then set | What it is for |
|---|---|---|---|
| ~~Pitch deck (PDF)~~ **done** | `public/media/` | `file` in `src/data/media.ts` | Built by the site from its own pages, English and Arabic: `npm run build && npm run docs && npm run build`. On `/business`, `/media` and (the profile) `/about`. To use a deck of your own instead, drop the PDF in and point `file` at it. |
| ~~Company profile (PDF)~~ **done** | `public/media/` | same | Same. |
| **Brand guidelines (PDF)** | `public/media/` | same | `/media`, under the logo rules. |
| **Vector master of the full logo** (falcon **+** the "Shaheen Money" wordmark) | `src/assets/brand/` | — | Today the site only holds the falcon, and it was **traced from a 239-pixel PNG**, not drawn. The wordmark is set in live type, so there is no file to hand a journalist or a printer. This is the one brand asset genuinely missing. |
| ~~App screenshots~~ **done** | `src/assets/app/`, `public/media/` | `appScreens` in `src/data/media.ts` | The home screen on iPhone and Android, on the site and downloadable from `/media`. More real screens (sending, a cash-out code) are welcome; real screens only, no invented names or balances. |
| **Connector photo** | `src/assets/` | `connectorStory` | Homepage proof section |

---

## 4. Blog

| What | Where |
|---|---|
| The 11 posts from the current site | `npm run import:legacy` writes them to `src/content/blog/en/`, then review each one |
| Arabic translations | `src/content/blog/ar/<same-slug>.md` |

---

## 5. Settings to confirm

| What | Where | Why |
|---|---|---|
| A monitored `security@shaheen.money` mailbox | `src/config/site.ts` | `/.well-known/security.txt` currently points at `hello@`; a researcher reporting a vulnerability should not land in a general inbox |
| The App Store link still carries the campaign token **"Empowch W Arabic"** | `src/config/site.ts` | Website installs are being attributed to an old campaign |
| Shared rate limiting: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Vercel | Without it each serverless instance counts form submissions separately |
| Bot protection: `PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Vercel | Cloudflare Turnstile on both forms |
| HSTS for subdomains | `src/config/headers.mjs` | Flip `HSTS_COVER_SUBDOMAINS` **only** after confirming every subdomain serves HTTPS — browsers remember it for two years and it cannot be withdrawn quickly |
| Globe corridors | `src/data/network-map.ts` | They are labelled as examples. Confirm the city list reflects corridors you actually serve or intend to |

---

## How a fact should arrive

Not just the number — the number, where it came from, and when it was true:

```
77% of adults in Lebanon have no account at a bank or mobile-money provider
  source:  World Bank, Global Findex 2025
  url:     https://www.worldbank.org/en/publication/globalfindex
  as of:   2024 survey data
  note:    Account ownership was 23.0% of adults (indicator FX.OWN.TOTL.ZS)
```

That is a real entry from `src/data/stats.ts`. Every figure on the site looks
like that, which is why the site can show its sources under each number and why
nobody has to take a claim on trust.
