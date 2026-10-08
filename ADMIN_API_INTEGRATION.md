# Connecting the Shaheen app's data

The Operations Command Center (`/x7k9p-dashboard`) is complete on both
sides of the line: the screens, and the server behind them, with sign-in,
two-factor, sessions, lockouts, the permission check on every request,
email masking per role, CSV exports and the audit log
([ADMIN_AUTH_INTEGRATION.md](ADMIN_AUTH_INTEGRATION.md)).

**One task remains, for the main developer: answer the console's questions
from the Shaheen app's database**, in one file:
[`src/server/admin/shaheen-source.ts`](src/server/admin/shaheen-source.ts).
Each of its 17 functions returns one shape from
`src/admin/types/admin.ts`; until a function is written, its screen says
"Waiting for the Shaheen app's data" instead of showing figures. Nothing
else changes: no screen, no route, no auth.

Field meanings and how each figure is computed:
[ADMIN_DATA_REQUIREMENTS.md](ADMIN_DATA_REQUIREMENTS.md).
A complete, working implementation of every function on generated data, to
copy the shapes from: `src/admin/mock/source.ts` (the demo source).

## How it is wired

```
 browser: screens (src/pages/x7k9p-dashboard, src/admin/pages)
     │  fetch /api/admin/…  (session cookie, X-Requested-With)
 server: src/pages/api/admin/[...path].ts → src/server/admin/router.ts
     │  session ✓  permission ✓  inputs ✓  then masks emails, logs exports
     │  calls one AdminDataSource (src/server/admin/data-source.ts)
     ├─ the app's data   src/server/admin/shaheen-source.ts   ← TO CONNECT
     └─ the demo         src/admin/mock/source.ts             (generated, stamped)
```

Which one answers is decided on the server at runtime
(`src/server/admin/mode.ts`): the app's data in production, the demo in
development, and the demo on a showcase deployment with `ADMIN_DEMO=true`
(ADMIN_AUTH_INTEGRATION.md). Every demo screen carries the "Mock data"
stamp. Once `connected` is `true` in `shaheen-source.ts`, only the app's
data is ever used: the demo and its accounts are switched off everywhere.

## Writing a function

- Return **full** data: emails in full (the router masks them per role).
- **Page, filter and sort in the database**: `page` is 1-based,
  `pageSize` at most 100; the router has already checked every value.
- Return `null` for a record that does not exist; the API answers 404.
- Throw `SourceUnavailableError` (from `./data-source`) for a temporary
  failure (the database did not answer): the screen offers **Try again**.
  Any other error is logged and answered with a 500.
- Never return passwords, private keys, recovery phrases or tokens. Shaheen
  is self-custodial and should not hold keys at all.
- Database credentials go in server environment variables (Vercel →
  Environment Variables), read in this file; never a `PUBLIC_` variable.
- The functions run on Vercel's serverless functions (Node). A database
  driver that works there (Postgres, MySQL, an internal HTTP API) is fine;
  add it to `package.json` like any dependency.

## Shared shapes

- Times: ISO 8601 strings in UTC (`"2026-10-07T16:42:00.000Z"`).
- Money on one record: a **decimal string** (`"250.00"`), never a float.
  Aggregates (volumes, chart points) are numbers in US dollars.
- Countries: ISO 3166-1 alpha-2 (`"JO"`). The console names them and places
  them on the map itself (`src/admin/lib/geo.ts`).
- `range`: `24h` | `7d` | `30d` | `90d` | `1y`. Windows end now and are aligned
  to whole hours (24h), days (7d–90d) or weeks (1y); "previous" is the window
  of equal length immediately before.
- Pages: `page` (1-based) and `pageSize` (max 100) in; out:

```json
{ "items": [], "total": 9973, "page": 1, "pageSize": 25 }
```

- Cursor pages (activity): `cursor` in; out: `{ "items": [], "nextCursor": "string|null" }`.
- `Metric` (a headline figure):

```json
{ "value": 1503, "previous": 1385, "unit": "count", "series": [105, 116, 128, 158, 108, 129, 122, 120, 131, 125, 116, 145] }
```

`series` is optional (12 evenly spaced points across the window, oldest
first; drawn as the sparkline). `previous: null` when there is nothing to
compare with. The console computes the percentage change itself.


## The functions, and the routes that call them

| Data source function | Route | Permission (checked by the router) |
| --- | --- | --- |
| `getDashboardStats(range)` | `GET /api/admin/stats?range=` | `console:access` |
| `getMoneyMovement(range)` | `GET /api/admin/money-movement?range=` | `transactions:read` |
| `getUserSummary()` | `GET /api/admin/users/summary` | `users:read` |
| `getUsers(query)` | `GET /api/admin/users` | `users:read` (emails masked without `users:read_pii`) |
| `getUserById(id)` | `GET /api/admin/users/{id}` | `users:read` (same masking) |
| `getTransactions(query)` | `GET /api/admin/transactions` | `transactions:read` |
| `getTransactionById(id)` | `GET /api/admin/transactions/{id}` | `transactions:read` |
| `getTransactionAnalytics(range, type)` | `GET /api/admin/transactions/analytics` | `transactions:read` |
| `getConnectorSummary()` | `GET /api/admin/connectors/summary` | `connectors:read` |
| `getConnectors(query)` | `GET /api/admin/connectors` | `connectors:read` |
| `getConnectorById(id)` | `GET /api/admin/connectors/{id}` | `connectors:read` |
| `getGlobalNetwork(range)` | `GET /api/admin/network` | `network:read` |
| `getAssets(range)` | `GET /api/admin/assets` | `assets:read` |
| `getUserAnalytics(range)` | `GET /api/admin/analytics/users` | `analytics:read` |
| `getActivity(query)` | `GET /api/admin/activity` | `activity:read` |
| `getSystemHealth()` | `GET /api/admin/system-health` | `system:read` |
| `search(text)` | `GET /api/admin/search?q=` | `console:access`; groups the role may not read are left out |
| (already done) | `GET /api/admin/{users,transactions,connectors,analytics}/export` | `*:export`; built from the functions above, logged |
| (already done) | `GET /api/admin/security` | `security:read`; from the console's own audit log |

## What each function returns

### `getDashboardStats(range)` → `DashboardStats`

```json
{
  "range": "30d",
  "generatedAt": "2026-10-07T16:42:00.000Z",
  "totalUsers": { "value": 9973, "previous": 8470, "unit": "count", "series": [] },
  "newUsers": { "value": 1503, "previous": 1385, "unit": "count", "series": [] },
  "activeUsers": { "value": 6753, "previous": 6120, "unit": "count", "series": [] },
  "transactionVolume": { "value": 719373.39, "previous": 601417.66, "unit": "usd", "series": [] },
  "activeCountries": { "value": 12, "previous": 12, "unit": "count", "series": [] },
  "activeConnectors": { "value": 45, "previous": 47, "unit": "count", "series": [] }
}
```

`totalUsers.previous` is the total at the start of the window.

### `getMoneyMovement(range)` → `MoneyMovement`

```json
{
  "range": "30d",
  "generatedAt": "…",
  "stages": {
    "receive": { "type": "receive", "volumeUsd": 434695, "count": 1167, "previousVolumeUsd": 398110, "series": [] },
    "send": { "type": "send", "volumeUsd": 135405, "count": 846, "previousVolumeUsd": 120002, "series": [] },
    "payment": { "type": "payment", "volumeUsd": 34083, "count": 690, "previousVolumeUsd": 31877, "series": [] },
    "cash_out": { "type": "cash_out", "volumeUsd": 115190, "count": 569, "previousVolumeUsd": 105670, "series": [] }
  },
  "store": { "fundedWallets": 3165, "previousFundedWallets": 2649, "walletBalanceUsd": 1300887.49 }
}
```

`store` describes user wallets. Shaheen is self-custodial: if the app
cannot observe balances, return `walletBalanceUsd: null` and the screen shows
the funded-wallet count instead.

### `getUsers(query)` → `Page<AdminUser>`

Query: `page`, `pageSize`, `search` (name, email or ID), `status`
(`active|inactive|pending|suspended`), `country`, `sort`
(`name|country|joinedAt|status|lastActiveAt`), `dir` (`asc|desc`).

```json
{
  "items": [
    {
      "id": "usr_YF73PUHP3T",
      "name": "Aya Saleh",
      "email": "a•••@example.com",
      "country": "DE",
      "joinedAt": "2026-10-07T16:18:00.000Z",
      "status": "active",
      "lastActiveAt": "2026-10-07T16:34:00.000Z",
      "walletStatus": "active"
    }
  ],
  "total": 9973,
  "page": 1,
  "pageSize": 25
}
```

Return **full** emails: the API layer masks them for roles without
`users:read_pii` (`src/server/admin/router.ts`).

`getUserSummary()` → `UserSummary`: `total`, `new30d`,
`active30d`, `inactive` (each a `Metric`) and `countries` (codes with at
least one user: the filter's options).

`getUserById(id)` → `AdminUserDetail` or `null`: the list fields plus
`onboarding`, `appVersion`, `device`, `platform` and `totals`
(`{ transactions, volumeUsd }`), each optional. Never passwords, private
keys, recovery phrases or tokens.

### `getTransactions(query)` → `Page<Transaction>`

Query: `page`, `pageSize`, `search` (ID or party name), `type`
(`receive|send|payment|cash_out`), `status`
(`completed|pending|failed|cancelled`), `range`, `userId` (as sender or
recipient), `connectorId`, `sort` (`createdAt|usdValue|status|type`), `dir`.
Default order: newest first.

```json
{
  "id": "txn_UTAKQEYRNKHS",
  "type": "receive",
  "status": "completed",
  "amount": "437.01",
  "asset": "USDT",
  "usdValue": "437.01",
  "from": { "kind": "external", "name": "External wallet", "country": "GB" },
  "to": { "kind": "user", "id": "usr_…", "name": "Jana Rifai", "country": "JO" },
  "corridor": { "from": "GB", "to": "JO" },
  "createdAt": "2026-10-07T16:09:00.000Z",
  "completedAt": "2026-10-07T16:11:00.000Z",
  "failureReason": null
}
```

`getTransactionById(id)` → one `Transaction` (the receipt) or `null`.

### `getTransactionAnalytics(range, type)` → `TransactionAnalytics`

`type` omitted means all types.

```json
{
  "range": "30d",
  "type": "cash_out",
  "generatedAt": "…",
  "bucket": "day",
  "totals": { "count": 584, "completed": 551, "pending": 2, "failed": 21, "cancelled": 10, "volumeUsd": 115190, "previousCount": 530, "previousVolumeUsd": 105670 },
  "series": [{ "t": "2026-09-08T00:00:00.000Z", "volumeUsd": 3620, "count": 19, "completed": 18, "failed": 1 }]
}
```

Buckets: `hour` ×24 for 24h, `day` ×7/30/90, `week` ×52 for 1y.

### Connectors

`getConnectorSummary()` → `ConnectorSummary`:

```json
{
  "generatedAt": "…",
  "total": 64, "active": 46, "inactive": 13, "pending": 5,
  "countries": ["AE", "EG", "JO", "LB"],
  "cashOut": { "volumeUsd": 115190, "count": 569, "previousVolumeUsd": 105670, "previousCount": 517 },
  "activity": [{ "t": "2026-09-08T00:00:00.000Z", "value": 16 }]
}
```

`getConnectors(query)` → `Page<Connector>`. Query: `page`, `pageSize`,
`search` (name, city or ID), `status` (`active|inactive|pending`),
`country`, `sort` (`name|country|city|status|transactionCount|volumeUsd|lastActiveAt`), `dir`.

```json
{ "id": "con_8DZWFQKC", "name": "Al Rawabi Hardware", "country": "EG", "city": "Alexandria", "status": "active", "transactionCount": 32, "volumeUsd": "8880.00", "lastActiveAt": "…" }
```

`transactionCount` and `volumeUsd` are completed cash-outs in the last 30
days. `getConnectorById(id)` (or `null`) adds `onboardedAt` and `activity`
(30 daily points: `{ date, count, volumeUsd }`).

### `getGlobalNetwork(range)` → `GlobalNetwork`

```json
{
  "range": "30d",
  "generatedAt": "…",
  "countries": [{ "code": "JO", "users": 4508, "connectors": 24, "volumeUsd": 360810, "sentUsd": 134530, "receivedUsd": 358800 }],
  "corridors": [{ "from": "AE", "to": "JO", "volumeUsd": 66895, "count": 241, "previousVolumeUsd": 59120 }]
}
```

Corridors are cross-border only, sorted by volume. Send `corridors: null`
if the app does not track them yet; the map then shows countries only.

### `getAssets(range)` → `AssetOverview`

```json
{
  "range": "30d", "generatedAt": "…", "bucket": "day",
  "assets": [{ "code": "USDC", "volumeUsd": 411504, "count": 1983, "previousVolumeUsd": 345110, "previousCount": 1702, "series": [{ "t": "…", "value": 13020 }] }]
}
```

Codes: `USDC`, `USDT`, `EUROC`. Shares are computed by the console.

### `getUserAnalytics(range)` → `UserAnalytics`

`newUsers`, `activeUsers` and `totalUsers` as `[{ t, value }]` per bucket,
and `retention`: up to eight weekly signup cohorts,
`{ cohort, size, retained: [1, 0.58, 0.5, …, null] }` (share of the cohort
active in week 0, 1, 2…; `null` for weeks not reached). Return
`retention: null` if it is not computed.

### `getActivity(query)` → `CursorPage<ActivityEvent>`

```json
{ "id": "evt_…", "kind": "transaction.failed", "category": "transactions", "at": "…", "severity": "warning",
  "subject": { "type": "transaction", "id": "txn_…", "label": "txn_…" }, "amountUsd": 1240, "asset": "USDC", "detail": "Network confirmation timed out" }
```

Kinds: `user.registered`, `user.onboarded`, `transaction.completed`,
`transaction.failed`, `cashout.completed`, `connector.activated`,
`connector.deactivated`, `admin.signed_in`, `security.alert`,
`system.degraded`, `system.resolved`. The console writes the sentence from
`kind` and the fields (so the source returns no prose). `admin.signed_in`
and `security.alert` belong to the console's own audit log: an app source
does not need them.

### `getSystemHealth()` → `SystemHealth`

```json
{
  "status": "operational",
  "checkedAt": "…",
  "services": [{ "id": "api", "status": "operational", "uptime30d": 100, "latencyP95Ms": 140, "checkedAt": "…",
                 "history": [{ "date": "…", "status": "operational" }], "message": null }],
  "incidents": [{ "id": "inc_…", "serviceId": "notifications", "status": "degraded", "title": "Push notifications delayed", "startedAt": "…", "resolvedAt": null }]
}
```

Service ids: `api`, `auth`, `wallets`, `transfers`, `payments`, `cashout`,
`connectors`, `notifications`. Feed it from real health checks (the app's
monitoring, or a ping of each service); the page polls every 60 seconds
while visible, and the top bar's status pill uses it on every page.

### `search(text)` → `SearchResults`

Up to five each of `users` (`id, name, email, country, status`),
`transactions` (`id, type, status, amount, asset, createdAt`) and
`connectors` (`id, name, city, country, status`). Return everything that
matches: the router leaves out the groups the role may not read and masks
emails.

## Connecting, step by step

1. Write the functions in `src/server/admin/shaheen-source.ts`, starting
   with `getUsers`, `getUserById` and `getTransactions` (the screens
   most used day to day). Each screen starts working as soon as its
   functions do.
2. Run `npm run dev` with `ADMIN_DATA_SOURCE=shaheen` and the database
   variables in `.env`, sign in, and compare each screen with the demo
   (`ADMIN_DATA_SOURCE=demo`): same shapes, real values.
3. Check the empty and error states with real responses (an empty filter, a
   stopped database).
4. When every function reads the real data, set `export const connected = true`
   at the top of `shaheen-source.ts`. From then on there is no demo: no
   generated figures and no demo accounts, in development or in production.
   Create your own account with `npm run admin:add` for local work.
5. In Vercel, set the database variables, `ADMIN_ACCOUNTS` and
   `ADMIN_SESSION_SECRET`, remove `ADMIN_DEMO` and `ADMIN_DATA_SOURCE`, and
   deploy. Nothing else needs to change.
