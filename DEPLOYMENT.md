# Deploying and finishing the site

> **بالعربي باختصار:** هاد الملف للمبرمج اللي رح يرفع الموقع ويكمّله. الخطوات بالترتيب:
> ١) شغّل الموقع على جهازك. ٢) ارفعه على Vercel واربط الدومين `shaheen.money`.
> ٣) **الأهم:** شغّل استلام الفورمز (إيميل عن طريق Resend أو Webhook)، لأنه بدونها فورم التواصل وفورم الأعمال بيقولوا "غير متاح مؤقتاً" وما بيوصل إشي.
> ٤) يُفضّل: Upstash للحد من الطلبات، وCloudflare Turnstile ضد البوتات، وإحصائيات بدون كوكيز.
> ٥) عبّي المعلومات الناقصة من الشركة (`CONTENT-NEEDED.md`)، وشغّل `npm run check:launch` لتشوف شو ضايل.
> بعد أي تغيير بالمتغيرات على Vercel لازم تعمل **Redeploy** حتى يشتغل.

The steps below are in order. Steps 1 to 3 are required for launch; 4 to 6 are
recommended. The checklist at the end is the short version.

---

## 1. Run it locally

```bash
npm ci               # installs the exact versions in package-lock.json
npm run dev          # http://localhost:4321/en (the forms work here without any setup)
npm run verify       # every check the CI runs: lint, types, build, output checks, tests
```

Node 22.12 or newer (`.nvmrc`). Nothing needs a `.env` to run or build; copy
`.env.example` to `.env` only to try a service locally.

In development the forms accept submissions and print the field names to the
terminal; nothing is sent anywhere until step 3.

## 2. Deploy on Vercel and connect the domain

1. Vercel → **Add New → Project** → import this GitHub repository.
2. Leave the defaults: framework **Astro**, build command `npm run build`,
   no output directory. Node.js version 22.x (Project → Settings → Build and Deployment).
3. Deploy. The build also writes the security headers, the content security
   policy, the `/download` routing and the legacy redirects
   (`scripts/postbuild.mjs`), so nothing needs adding in `vercel.json`.
4. Project → Settings → **Domains**: add `shaheen.money` and `www.shaheen.money`,
   set the DNS records Vercel shows at the domain registrar, and make `www`
   redirect to `shaheen.money` (the canonical address in `astro.config.mjs`).
5. Preview deployments are `noindex` automatically; only production is indexed.

Every push to `main` deploys to production; every other branch gets a preview
URL. The CI (`.github/workflows/ci.yml`) runs all the checks on each push and
pull request.

## 3. Make the forms deliver (the one launch blocker)

The contact form and the business application post to `/api/forms/contact`
and `/api/forms/business` (`src/pages/api/forms/`, `src/lib/forms/`). In
production, until a delivery method is set, they answer "temporarily
unavailable" so that no message is silently lost. Set **one or both** of the
following in Vercel → Project → Settings → **Environment Variables**
(Production), then **redeploy**.

### Option A: by email, with Resend

1. Create an account at resend.com and add the domain `shaheen.money`.
   Put the DNS records it gives (SPF, DKIM) at the registrar and wait until
   Resend shows the domain as verified.
2. Create an API key with "sending access" only.
3. Set:

| Variable | Example | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_…` | the key from step 2 |
| `FORMS_EMAIL_FROM` | `Shaheen Money <forms@shaheen.money>` | must be on the verified domain |
| `FORMS_EMAIL_TO` | `hello@shaheen.money` | the team inbox that receives submissions |

Each submission arrives as a plain-text email, subject
`[shaheen.money] Contact form: …` or `[shaheen.money] New business application (…)`,
with **Reply-To** set to the visitor's email so the team can answer directly.
The recipient is fixed on the server; a visitor can never choose it.

### Option B: to a webhook (CRM, helpdesk, Slack, Make, Zapier)

| Variable | Notes |
| --- | --- |
| `FORMS_WEBHOOK_URL` | an HTTPS endpoint that accepts a JSON `POST` and answers 2xx |
| `FORMS_WEBHOOK_SECRET` | a long random string (for example `openssl rand -hex 32`); strongly recommended |

The request body:

```json
{ "kind": "contact", "submittedAt": "2026-10-18T09:30:00.000Z", "data": { "name": "…", "email": "…", "topic": "…", "message": "…" } }
```

`kind` is `contact` or `business`. With a secret set, two headers let the
receiver check the request came from the site:

- `X-Shaheen-Timestamp`: Unix seconds
- `X-Shaheen-Signature`: `sha256=` + HMAC-SHA256 of `<timestamp>.<raw body>` with the secret

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

function verify(rawBody, timestamp, signature, secret) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // older than 5 minutes
  const expected = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signature?.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

The site waits up to 8 seconds for the webhook. With both options set, a
submission counts as delivered when either one succeeds.

### Test it

After the redeploy, send one message from the contact page and one business
application, in English and in Arabic, and confirm all four arrive. Then run
`npm run check:launch` with the same variables set in your shell: the blocker should be
gone.

## 4. Recommended services

| Service | Variables | What it does |
| --- | --- | --- |
| **Upstash Redis** (free tier is enough) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shares the forms' rate limit across Vercel's serverless instances. Without it each instance counts on its own, which is weaker against floods. Create a Redis database at upstash.com and copy the **REST** URL and token. |
| **Cloudflare Turnstile** | `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Bot protection on both forms, without puzzles for real people. In Cloudflare → Turnstile, add a widget for `shaheen.money` (managed mode). The forms' CSP allows Turnstile automatically. |
| **Cookieless analytics** (e.g. Plausible) | `PUBLIC_ANALYTICS_SCRIPT_SRC`, `PUBLIC_ANALYTICS_DOMAIN` | Visit counts with no cookies, so no consent banner is needed. The script's origin is added to the CSP at build time. Proxying it through the site's own domain is better for privacy and ad blockers. |

Variables starting with `PUBLIC_` are baked into the pages at build time:
change them, then redeploy. All the others are read on the server, and Vercel
also applies them only to new deployments, so **redeploy after any change**.

`PUBLIC_SHOW_CONTENT_GAPS=true` (preview deployments only, never production)
shows dashed "content needed" markers where a fact is missing.

## 5. Content the company still has to supply

[CONTENT-NEEDED.md](CONTENT-NEEDED.md) lists every missing fact: what it is,
where it appears, and what the page does without it (the section is hidden,
never filled with a placeholder). Facts go into `src/data/facts.ts`, each with
its source and date. `npm run check:launch` prints the current list.

Also from that file, settings to confirm before launch:

- a monitored `security@shaheen.money` mailbox for `/.well-known/security.txt`
  (`src/config/site.ts`);
- the App Store link's old campaign token "Empowch W Arabic" (`src/config/site.ts`);
- `HSTS_COVER_SUBDOMAINS` in `src/config/headers.mjs`: switch it on **only**
  after every subdomain serves HTTPS, because browsers remember it for two years;
- the example corridors on the globe (`src/data/network-map.ts`);
- an Arabic translation of the privacy policy and terms (`src/content/legal/ar/`);
  until then the Arabic pages show the English text, marked as English.

## 6. Keeping it healthy

- Run `npm run verify` before every push; the CI runs the same checks and
  blocks a broken change.
- **Dependencies:** install with `npm ci` and keep `package-lock.json`.
  Do not run `npm audit fix` without testing a preview deployment first:
  `@astrojs/vercel` 11.0.13 broke the serverless functions, so the lockfile
  holds 11.0.11, and `overrides` in `package.json` pin patched versions of
  three build-time packages. After any dependency update, send a form on a
  preview deployment before merging.
- The design rules (colours, type, motion, RTL) are in
  [docs/DESIGN.md](docs/DESIGN.md); `npm run tokens` and `npm run lint:styles`
  enforce them.

---

## Launch checklist

- [ ] `npm ci && npm run verify` passes locally
- [ ] Project imported on Vercel, Node 22.x
- [ ] `shaheen.money` and `www` connected; `www` redirects to the bare domain
- [ ] Form delivery set (Resend and/or webhook), redeployed
- [ ] Four test submissions received (contact and business, English and Arabic)
- [ ] Upstash Redis set (recommended)
- [ ] Turnstile set (recommended)
- [ ] Analytics set, if wanted
- [ ] `npm run check:launch` shows no blockers
- [ ] Items in CONTENT-NEEDED.md sent to the company, and filled in as they arrive
- [ ] `security@shaheen.money` exists and is monitored
