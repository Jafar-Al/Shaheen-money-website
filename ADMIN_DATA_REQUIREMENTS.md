# Admin data requirements

The data the Shaheen app needs to provide to the Operations Command
Center: every record and aggregate the screens show, what each field means,
and how each figure is computed so that numbers agree from one screen to the
next.

This is the main developer's reference for the one file they connect,
`src/server/admin/shaheen-source.ts` (ADMIN_API_INTEGRATION.md). It does
not create or change a database, and it does not assume tables that may not
exist: map these fields from whatever the app already stores. A field
marked *optional* can be left out; the console then says "Not available"
instead of inventing a value. The TypeScript source of truth is
`src/admin/types/admin.ts`.

Staff accounts, sessions, the audit log and the Security page are **not**
part of this: the console keeps them itself (ADMIN_AUTH_INTEGRATION.md).

## Never exposed

The data source must never return, and the console never shows: passwords or
password hashes, private keys or recovery phrases (Shaheen is
self-custodial; it should not hold them at all), session or API tokens,
second-factor secrets, full card or bank numbers, or government ID numbers.
Users' emails are returned in full and masked by the console's server for
roles without `users:read_pii`; staff accounts and IP addresses in the
audit log are masked before they are stored (`l•••@shaheen.money`,
`185.23.x.x`).

## Definitions used everywhere

| Term | Definition |
| --- | --- |
| Volume | Sum of `usdValue` of **completed** transactions in the window, in US dollars. |
| Active user | A user with at least one session in the window: opened the app, or sent or received money. Pending-verification and suspended accounts are not counted. |
| User status `active` / `inactive` | Active = had a session in the last 30 days; inactive = verified, not suspended, no session in 30 days. |
| Active Connector | A Connector with at least one completed cash-out in the window. |
| Active country | A country that is the start or end of at least one completed transaction in the window. |
| Corridor | An ordered pair of countries (sender's → recipient's) with at least one completed cross-border transaction in the window. |
| Window | 24h / 7d / 30d / 90d / 1y ending now, aligned to whole hours (24h), days (7d–90d, the admin's calendar) or weeks (1y). |
| Previous | The window of equal length immediately before. `null` when the data does not go back that far. |
| Funded wallet | A user wallet that has received money at least once. |

## User

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | stable, opaque (`usr_…`) |
| `name` | string | yes | display name |
| `email` | string | yes | masked without `users:read_pii` |
| `country` | ISO 3166-1 alpha-2 | yes | country of residence |
| `joinedAt` | ISO time | yes | account created |
| `status` | `active` \| `inactive` \| `pending` \| `suspended` | yes | `pending` = verification not finished |
| `lastActiveAt` | ISO time \| null | yes | last session |
| `walletStatus` | `active` \| `not_created` \| `restricted` | optional | |
| `onboarding` | `complete` \| `in_progress` | optional, detail only | |
| `appVersion` | string | optional, detail only | e.g. `2.6.0` |
| `device` | string | optional, detail only | e.g. `iPhone 15 · iOS 18.6` |
| `platform` | `ios` \| `android` | optional, detail only | |
| `totals` | `{ transactions, volumeUsd }` | optional, detail only | since the account opened |

Server-side needs: search on name, email and ID; filter by status and
country; sort by name, country, join date, status and last activity; page
size up to 100.

## Transaction

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | `txn_…`, also the reference on the receipt |
| `type` | `receive` \| `send` \| `payment` \| `cash_out` | yes | receive = money arriving from outside Shaheen; send = to a person or wallet; payment = to a shop; cash_out = cash from a Connector |
| `status` | `completed` \| `pending` \| `failed` \| `cancelled` | yes | |
| `amount` | decimal string | yes | in `asset` units |
| `asset` | `USDC` \| `USDT` \| `EUROC` | yes | |
| `usdValue` | decimal string | yes | at the time of the transaction |
| `from`, `to` | Party | yes | see below |
| `corridor` | `{ from, to }` country codes | yes | sender's and recipient's countries |
| `createdAt` | ISO time | yes | |
| `completedAt` | ISO time \| null | optional | |
| `failureReason` | string \| null | optional | short, human-readable |

Party: `kind` (`user` \| `connector` \| `merchant` \| `external`), `id`
(for users and Connectors, so the console can link to them), `name`,
`country`.

Server-side needs: search on ID and party names; filter by type, status,
window, user (as sender or recipient) and Connector; sort by time, value,
status and type.

## Connector

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | `con_…` |
| `name` | string | yes | shop name |
| `country` | country code | yes | |
| `city` | string | yes | |
| `status` | `active` \| `inactive` \| `pending` | yes | `pending` = applied, not yet handing out cash |
| `transactionCount` | integer | yes | completed cash-outs, last 30 days |
| `volumeUsd` | decimal string | yes | completed cash-out volume, last 30 days |
| `lastActiveAt` | ISO time \| null | yes | last completed cash-out |
| `onboardedAt` | ISO time | optional, detail only | |
| `activity` | 30 × `{ date, count, volumeUsd }` | detail only | daily, oldest first |

## Aggregates

| Screen | Needs |
| --- | --- |
| Command Center | the six `Metric`s of `DashboardStats` with 12-point series; money movement; transaction analytics; network; recent activity; system health |
| Users | `UserSummary`: total, new (30 days), active (30 days), inactive, and the list of countries with users |
| Transactions | `TransactionAnalytics` per window and type: totals by status, completed volume, previous window, and a series per bucket with volume, count, completed and failed |
| Connectors | `ConnectorSummary`: counts by status, countries, cash-out volume and count (30 days + previous), daily cash-outs |
| Money Movement | completed volume, count and previous volume per type, a 12-point series each; funded wallets now and at the window's start; observed wallet balance (optional) |
| Global Network | per country: users, active Connectors, volume sent / received / total; per corridor: volume, count, previous volume |
| Assets | per asset: volume, count, previous volume and count, series per bucket |
| Analytics | per bucket: new users, active users, total users; optional weekly retention cohorts (share of each signup week active in later weeks) |
| Activity | an event log with the kinds listed in ADMIN_API_INTEGRATION.md, newest first, cursor-paged |
| System Health | per service: status, 30-day uptime, p95 latency, last check, 30 daily statuses; incidents with start and end |
| Security | nothing from the app: built from the console's own sessions and audit log |

Computing aggregates on the server (or from a reporting store) keeps the
console fast and keeps the figures identical on every screen. Each response
carries `generatedAt`, so a cached figure can say how fresh it is.

## Staff accounts (kept by the console, not by the app)

Staff accounts live in the `ADMIN_ACCOUNTS` environment variable, made by
`npm run admin:add`: id, name, email, role, an scrypt password hash and a
second-factor secret. Sessions and the audit log are kept by the console's
server. Nothing about staff needs to come from the app's database.

## Reference data the console keeps itself

Country names and map positions (`src/admin/lib/geo.ts`, built from the
site's own city list), service names and descriptions (`SERVICE_META` in
`src/admin/lib/format.ts`), asset names, and every label. The API sends
codes; the console writes the words. A country the app reports that is
not in `geo.ts` still appears in every table, just without a map marker
until a line is added there.
