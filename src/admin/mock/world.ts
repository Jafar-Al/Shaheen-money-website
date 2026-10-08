/**
 * MOCK DATA — the whole mock world, built once per page load: users,
 * Connectors and transactions, then the facts that follow from them (when a
 * user was last active, what a Connector handled). Every mock aggregate is
 * computed from this, the way the real backend would compute it from its
 * database.
 */
import { generateConnectors, type MockConnector } from './connectors';
import { generateTransactions, type MockTxn } from './transactions';
import { generateUsers, type MockUser } from './users';
import { DAY, NOW, TODAY, iso, once } from './seed';

export interface World {
  users: MockUser[];
  usersById: Map<string, MockUser>;
  connectors: MockConnector[];
  connectorsById: Map<string, MockConnector>;
  /** Oldest first. */
  txns: MockTxn[];
  txnsById: Map<string, MockTxn>;
  txnsByUser: Map<string, MockTxn[]>;
}

export const world = once((): World => {
  const users = generateUsers();
  const connectors = generateConnectors();
  const txns = generateTransactions(users, connectors);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const connectorsById = new Map(connectors.map((c) => [c.id, c]));
  const txnsById = new Map(txns.map((t) => [t.id, t]));
  const txnsByUser = new Map<string, MockTxn[]>();
  const touch = (id: string | undefined, t: MockTxn) => {
    if (!id || !usersById.has(id)) return;
    if (!txnsByUser.has(id)) txnsByUser.set(id, []);
    txnsByUser.get(id)!.push(t);
  };
  for (const t of txns) {
    touch(t.userId, t);
    if (t.to.kind === 'user' && t.to.id !== t.userId) touch(t.to.id, t);
  }

  // Sessions: app opens plus every transaction the user made or received.
  // Last active is the latest; active means a session in the last 30 days.
  const activeSince = TODAY - 29 * DAY;
  for (const u of users) {
    const list = txnsByUser.get(u.id) ?? [];
    if (list.length) u.sessions = [...u.sessions, ...list.map((t) => t.ms)].sort((a, b) => a - b);
    const last = u.sessions.length ? u.sessions[u.sessions.length - 1]! : u.joinedMs;
    u.lastActiveAt = iso(last);
    if (u.status === 'active' && last < activeSince) u.status = 'inactive';
    u.totals = {
      transactions: list.length,
      volumeUsd: list.filter((t) => t.status === 'completed').reduce((n, t) => n + t.usd, 0),
    };
  }

  // Connectors: the last 30 days of cash-outs, and when each last handed out cash.
  const since = NOW - 30 * DAY;
  const firstDay = TODAY - 29 * DAY;
  for (const c of connectors) {
    c.activity = Array.from({ length: 30 }, (_, i) => ({ date: iso(firstDay + i * DAY), count: 0, volumeUsd: 0 }));
  }
  const volume = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== 'cash_out' || !t.connectorId || t.status !== 'completed') continue;
    const c = connectorsById.get(t.connectorId)!;
    c.lastActiveAt = t.createdAt;
    if (t.ms >= since) {
      c.transactionCount += 1;
      volume.set(c.id, (volume.get(c.id) ?? 0) + t.usd);
    }
    if (t.ms >= firstDay) {
      const day = c.activity[Math.floor((t.ms - firstDay) / DAY)];
      if (day) {
        day.count += 1;
        day.volumeUsd += t.usd;
      }
    }
  }
  for (const c of connectors) c.volumeUsd = (volume.get(c.id) ?? 0).toFixed(2);

  return { users, usersById, connectors, connectorsById, txns, txnsById, txnsByUser };
});
