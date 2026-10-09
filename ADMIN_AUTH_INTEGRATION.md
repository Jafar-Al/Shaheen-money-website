# Admin sign-in and access

How staff sign in to the Operations Command Center (`/x7k9p-dashboard`),
how their access is enforced, and how to set it up. **This is built and
working**: nothing here is for the main developer to build. Their one task
is the data connection described in [ADMIN_API_INTEGRATION.md](ADMIN_API_INTEGRATION.md).

> **The rule this design rests on:** the browser decides what to *show*; the
> server decides what *exists* for a session. The unlisted path, the hidden
> navigation links and the "outside your access" screens are conveniences.
> The server checks the session and the permission on every request, so
> someone who finds the path, edits the JavaScript or calls the API directly
> gets nothing without a valid session and the right role.

## Setting it up (once)

1. **Create your account**, on your own computer, in the project folder:

   ```bash
   npm run admin:add -- --email you@shaheen.money --name "Your Name" --role ADMIN
   ```

   Type your password when asked (hidden; at least 12 characters), or add
   `--generate` for a strong random one shown once. It then shows a
   **setup key**: add it to an authenticator app (Google Authenticator,
   Microsoft Authenticator, 1Password…) and type the 6-digit code to confirm.
   The password itself is never written anywhere; only its scrypt hash is.

2. **Copy the two values it prints** into Vercel → your project → Settings →
   Environment Variables (Production):
   - `ADMIN_ACCOUNTS`: every staff account (emails, names, roles, password
     hashes, two-factor secrets);
   - `ADMIN_SESSION_SECRET`: the key that signs session cookies.

   Both are secrets: paste them only into Vercel, never into a chat, an email
   or the repository. Then redeploy.

3. **Required for real staff:** connect Upstash Redis (`UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`, the same store the site's forms can use). It
   makes lockouts, one-time codes and sign-out hold on every serverless
   instance; without it a lockout could be dodged by reaching another
   instance, and signing out could not revoke a copied cookie. So a
   deployment with real staff accounts refuses every sign-in until it is set
   (the demo, with `ADMIN_DEMO=true`, works without it). If Upstash stops
   answering, the console refuses rather than falling back to weaker
   per-instance memory (fail closed).

Add more staff the same way (`--role OPERATIONS`, `COMPLIANCE` or `SUPPORT`),
list them with `npm run admin:list`, remove one with
`npm run admin:remove -- --email …`, and paste the new `ADMIN_ACCOUNTS` into
Vercel each time. Removing someone ends their sessions on their next request.

## Settings (server environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `ADMIN_ACCOUNTS` | none | The staff accounts (JSON written by `npm run admin:add`). Production refuses every sign-in without it. |
| `ADMIN_SESSION_SECRET` | none in production | At least 32 characters; signs the session cookies. Changing it signs everyone out. |
| `ADMIN_REQUIRE_MFA` | `true` in production | `false` lets accounts without a second factor sign in. Not recommended. |
| `ADMIN_DATA_SOURCE` | `shaheen` in production, `demo` in development | `demo` serves generated data, stamped "Mock data" on every screen. Ignored once the app's data is connected. |
| `ADMIN_DEMO` | off | `true` makes a deployment a showcase: generated data and the demo accounts (below). Ignored once the app's data is connected. |
| `UPSTASH_REDIS_REST_URL`, `_TOKEN` | none | Shared store for lockouts, sessions and the audit log. |

None is ever sent to a browser. In development (`npm run dev`) with no
`ADMIN_ACCOUNTS`, the server accepts the demo accounts in
`src/admin/mock/admins.ts` (one per role; the compliance one has a second
factor) and serves generated data.

## A showcase deployment (the demo)

To let founders or partners look around before the app's data is connected,
a deployment can run the demo: set `ADMIN_DEMO=true` and an
`ADMIN_SESSION_SECRET` (`npm run admin:secret` prints one) in Vercel, and
redeploy. Then:

- every screen shows generated data, with the "Mock data" stamp;
- the demo accounts can sign in, for example `admin@shaheen.test` with the
  shared password in `src/admin/mock/admins.ts`; they need no second
  factor, because they see only generated data and their password is
  published with the demo;
- staff accounts in `ADMIN_ACCOUNTS`, if any, work too and see the same
  generated data.

**The demo ends by itself.** When the developer sets `connected = true` in
`src/server/admin/shaheen-source.ts` (every function reads the real data),
the next deploy has no generated data and no demo accounts, whatever
`ADMIN_DEMO` or `ADMIN_DATA_SOURCE` say, and open demo sessions stop on
their next request. The rules are in `src/server/admin/mode.ts` and tested
in `tests/admin-mode.spec.ts`. Remove `ADMIN_DEMO` from Vercel at the same
time, so the settings say what the site does.

## How a sign-in works

`POST /api/admin/auth/sign-in` with `{ email, password, code? }`
(`src/server/admin/auth.ts`):

0. **Store ready.** A deployment with real staff accounts and no shared
   store (Upstash) refuses with `503 not_configured` (see setup step 3).
1. **Lockout first.** Five failures on an account, or thirty from one
   address, within 15 minutes → `429` with `Retry-After`, before any password
   is checked.
2. **Password.** Checked against the account's scrypt hash
   (N=2^15, r=8, p=1). An unknown email is checked against a dummy hash, so
   it takes the same time and gets the same answer as a wrong password: no
   one can learn which emails have accounts.
3. **Second factor.** An account with one gets `401 mfa_required`; the page
   shows a code field and sends the same email and password again with the
   code (RFC 6238 TOTP, 30-second steps, one step of clock drift allowed).
   Each code is accepted once. In production an account without a second
   factor cannot sign in unless `ADMIN_REQUIRE_MFA=false`; the demo
   accounts, while the demo is on, are the only exception.
   **Where the second factor is required (production), no answer ever
   confirms a password on its own:** without a code, every email (real or
   not) gets `401 mfa_required` before the password is even checked; with a
   code, a wrong password and a wrong code both get `401 invalid_credentials`
   (the audit log keeps the real reason). A leaked password cannot be tested
   without the authenticator.
4. **Console access.** A valid account without `console:access` (role `USER`)
   gets `403 not_authorized`.
5. **Session.** A signed, httpOnly cookie is set and the outcome is written
   to the audit log (masked).

| Answer | Meaning | What the page says |
| --- | --- | --- |
| `200 { session }` | signed in | goes to the page you were sent from |
| `401 invalid_credentials` | wrong email or password (in production: or wrong code) | "That email and password don't match…" (after a code was asked for: "That email, password or code don't match…") |
| `401 mfa_required` | a code is needed (in production: asked of every email, before the password) | shows the code field |
| `401 mfa_invalid` | wrong or reused code (development only; production answers `invalid_credentials`) | "That code didn't match…" |
| `403 not_authorized` | no console access | "This account can't open the operations console." |
| `429` + `Retry-After` | locked out | "Too many attempts… about N minutes." |
| `503 not_configured` | no accounts or secret, or no second factor where required | "Sign-in isn't set up on this server yet…" |

The other auth routes: `GET /auth/session` (the current session or 401),
`POST /auth/refresh` (moves the idle window), `POST /auth/sign-out`,
`GET /auth/config` (only booleans: configured, second factor required,
demo accounts accepted).

## Sessions

`src/server/admin/session.ts`. The cookie is
`__Host-shaheen_ops; HttpOnly; Secure; SameSite=Strict; Path=/`, so page
JavaScript can never read it and other sites can never send it. Its value is
the session's claims signed with HMAC-SHA256 (`ADMIN_SESSION_SECRET`). A
cookie counts only if the signature matches, it has not expired, and the
account still exists and is not disabled; the role is read from the account
on every request, so a role change applies at once.

- **Idle timeout** 30 minutes; each request in the second half of the window
  slides it forward, and the console refreshes it 5 minutes before the end.
- **Absolute limit** 8 hours after sign-in, whatever happens.
- **With Upstash** (required for real staff), the session must also still be
  on the server's list of open sessions, so sign-out (and revocation) end it
  everywhere at once.

## Every request after sign-in

`src/server/admin/router.ts`, one table for all of `/api/admin/*`:

- the request must carry `X-Requested-With: shaheen-ops`, must not be a
  cross-site request (Fetch Metadata), and a POST's `Origin` must be this
  site: with `SameSite=Strict`, no other site can make an admin's browser
  call the API;
- the session is checked, then **the permission named beside the route**
  (below); missing either → `401` / `403`;
- every input is checked against its allowed values (ranges, statuses,
  sorts, page sizes up to 100, ID shapes) → `400` otherwise;
- emails are masked unless the role has `users:read_pii`, whatever the data
  source returns;
- every answer is `Cache-Control: no-store`.

Before any page is served, the edge sends a visitor without a session cookie
to sign-in (`scripts/postbuild.mjs`), and marks the path `noindex`,
`no-store` and `no-referrer`. The pages themselves hold no data.

## Roles and permissions

`src/admin/services/permissions.ts`:

| Permission | ADMIN | OPERATIONS | COMPLIANCE | SUPPORT | USER |
| --- | :-: | :-: | :-: | :-: | :-: |
| `console:access` | ✓ | ✓ | ✓ | ✓ | |
| `users:read` | ✓ | ✓ | ✓ | ✓ | |
| `users:read_pii` (full emails) | ✓ | | ✓ | ✓ | |
| `users:export` | ✓ | | ✓ | | |
| `transactions:read` | ✓ | ✓ | ✓ | ✓ | |
| `transactions:export` | ✓ | ✓ | ✓ | | |
| `connectors:read` | ✓ | ✓ | ✓ | ✓ | |
| `connectors:export` | ✓ | ✓ | | | |
| `network:read` | ✓ | ✓ | ✓ | | |
| `assets:read` | ✓ | ✓ | ✓ | | |
| `analytics:read` | ✓ | ✓ | ✓ | | |
| `analytics:export` | ✓ | ✓ | | | |
| `activity:read` | ✓ | ✓ | ✓ | ✓ | |
| `system:read` | ✓ | ✓ | | ✓ | |
| `security:read` | ✓ | | ✓ | | |

To change what a role may do, edit this table; the server and the console
both read it.

## Audit log

`src/server/admin/audit.ts` records every sign-in and failed sign-in, every
refused second factor, lockouts, sign-outs and exports (who, how many rows,
which filters), with accounts and addresses masked. It goes to the shared
store (the Security page reads it) and to the platform's logs (Vercel →
Logs), where it outlives the store's 1,000-entry list.

## Checks

`tests/admin-api.spec.ts` (run with `npx playwright test --project=admin`)
proves the refusals: no header, no session, a forged cookie, a cross-site
request, another origin's POST, wrong password and unknown email answered
alike, an app user refused, the cookie's flags, lockout with `Retry-After`,
sign-out, the second factor asked for, checked and not accepted twice, each
role refused what it may not read, emails masked per role, inputs outside
their values, and exports logged.
