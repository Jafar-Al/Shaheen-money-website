# What the website still needs from the company

> **بالعربي:** هذا الملف فيه كل إشي ناقص للموقع، ولشو بينستخدم، وبأي شكل لازم يوصل.
> عبّي الخانات وابعتها، وكل وحدة بتتحط بمكانها وبيرجع القسم يظهر.
> لتشوف القائمة محدّثة بأي وقت: `npm run check:launch`

Every claim on this site carries a source and a date, or it is not published.
An empty slot below does not show a placeholder — **the section that depends on
it is left out of the page entirely.** Two sections are missing from the live
homepage today for exactly this reason (the trust strip at the top of every
page, and "People who use Shaheen Money").

Each row says where the fact appears and what happens without it. The `field`
column is the exact place it goes in `src/data/facts.ts`, so whoever fills this
in and whoever edits the code are talking about the same thing.

---

## 1. Blockers — the site cannot launch without these

### 1.1 The registered company

Appears in the **footer of every page, in both languages**, on `/about` and in
the newsroom fact box on `/media`. Without it the footer's company block is
omitted, and a journalist or a partner who cannot find the legal entity writes
"could not be verified".

| What | field | Your answer |
|---|---|---|
| Legal name exactly as registered | `company.legalName` | |
| Company / commercial registration number | `company.registrationNumber` | |
| Registered address (EN + AR) | `company.registeredAddress` | |
| Jurisdiction — country/state of registration (EN + AR) | `company.jurisdiction` | |

### 1.2 Licence and regulator

Appears in the **trust strip above the header on the homepage**, in the footer,
and on `/security`. This is the single biggest objection a visitor has before
sending money. Without it the trust strip does not render at all.

| What | field | Your answer |
|---|---|---|
| Regulator name (EN + AR) | `licences[].regulator` | |
| Licence / registration type (EN + AR) | `licences[].licenceType` | |
| Licence number | `licences[].number` | |
| Jurisdiction it covers (EN + AR) | `licences[].jurisdiction` | |
| **Public register URL** a visitor can check themselves | `licences[].registerUrl` | |

Add one block per licence if there is more than one.

### 1.3 How customer money is held

Appears in the **trust strip** and on `/security`. One or two sentences, in both
languages, plus where the statement comes from and the date it is true as of.

| What | field | Your answer |
|---|---|---|
| e.g. "Held 1:1 in segregated accounts at …" (EN + AR) | `safeguarding.value` | |
| Source — the document or policy this comes from | `safeguarding.source` | |
| As-of date | `safeguarding.source.asOf` | |

### 1.4 What a digital dollar is, and what backs it

Appears in **"Good to know"** inside the homepage's *How it works* section, and
on `/security`. This is the most-asked question about the product. Without it
the paragraph is omitted and the app's core promise goes unexplained.

| What | field | Your answer |
|---|---|---|
| One paragraph (EN + AR): what the balance is, what backs it, who holds the reserve | `digitalDollar.value` | |
| Source + as-of date | `digitalDollar.source` | |

### 1.5 The fee schedule

Appears in **"What it costs"** on the homepage. Without it the fee table is
omitted, and "low fees" cannot be claimed anywhere on the site.

Every fee a customer can be charged, one row each — **receive, send, pay, cash
out, inactivity, currency conversion** — in both languages, plus the date the
schedule applies from.

| What | field | Your answer |
|---|---|---|
| Fee rows (item + amount, EN + AR) | `pricing.schedule.value` | |
| Effective-from date | `pricing.schedule.source.asOf` | |

### 1.6 Legal documents

`/legal/privacy`, `/legal/terms`, `/legal/cookies` in both languages. They exist
as drafts today and are marked as such on the page. A lawyer has to review them
and the file's `status:` set to `approved`. The audit found the current privacy
policy names no data controller.

→ `src/content/legal/<locale>/<doc>.md`

### 1.7 Form delivery (a setting, not content)

Without one of these the contact and business forms answer "temporarily
unavailable" and nothing reaches you.

In **Vercel → Settings → Environment Variables**, either:
- `FORMS_WEBHOOK_URL` (+ `FORMS_WEBHOOK_SECRET`) — sends submissions to a CRM,
  ticketing system, Slack, Make or Zapier; or
- `RESEND_API_KEY` + `FORMS_EMAIL_TO` + `FORMS_EMAIL_FROM` — sends them by email.

Both is fine, and safer.

---

## 2. Important — each one brings a section back

### 2.1 The Connector programme

`/business` is the page that recruits shops. Its economics are the highest-value
missing content on the site: a shop owner will not apply without knowing what
they earn.

| What | field | Appears | Your answer |
|---|---|---|---|
| Commission per cash-out, as a % | `connectorProgram.commissionPercent` | Homepage network card + `/business` | |
| Date it applies from | same `.source.asOf` | | |
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

| What | field | Appears | Your answer |
|---|---|---|---|
| Photo of Moataz Alobaid, with consent to publish | `team[].photo` | `/about` | |
| His name in Arabic, spelled the way he writes it | `team[].nameAr` | `/about`, `/media` | |
| Confirm the founder quote on `/about` is still what he wants to say — it is the wording from the current site | copy | `/about` | |

---

## 3. Files and images

Drop each file where the table says and it is picked up automatically. The build
**fails** if a listed file is missing, so a download link on this site cannot
quietly rot.

| File | Put it in | Then set | What it is for |
|---|---|---|---|
| **Pitch deck (PDF)** | `public/media/` | `file` in `src/data/media.ts` | `/business` "documents you'll want before a first call", and `/media`. For partners and investors. |
| **Company profile (PDF)** | `public/media/` | same | Same two places. |
| **Brand guidelines (PDF)** | `public/media/` | same | `/media`, under the logo rules. |
| **Vector master of the full logo** (falcon **+** the "Shaheen Money" wordmark) | `src/assets/brand/` | — | Today the site only holds the falcon, and it was **traced from a 239-pixel PNG**, not drawn. The wordmark is set in live type, so there is no file to hand a journalist or a printer. This is the one brand asset genuinely missing. |
| **App screenshots** | `public/media/` | — | `/media` and the store listings. Real screens only — no invented names or balances. |
| **Founder photo** | `src/assets/` | `team[].photo` | `/about` |
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
