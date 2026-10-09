/**
 * 11 · Security. One request (security:read) feeds every block on the page.
 */
import { getSecurityOverview } from '../services/adminApi';
import type { SecurityEvent, SecurityOverview, SignInAttempt } from '../types/admin';
import { ROLE_LABEL } from '../services/permissions';
import { ago, dateTime } from '../lib/format';
import { h, need } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { badge, fillMetric } from '../ui/render';
import { boot } from '../ui/shell';

const REASON: Record<string, string> = {
  invalid_credentials: 'Wrong email or password',
  not_authorized: 'Account has no console access',
  rate_limited: 'Too many attempts',
  mfa_failed: 'Second factor rejected',
  no_second_factor: 'No second factor set up',
};

const EVENT: Record<SecurityEvent['kind'], string> = {
  'session.revoked': 'Session revoked',
  'role.changed': 'Role changed',
  'mfa.failed': 'Second factor failed',
  'account.locked': 'Account locked',
  'export.created': 'Data exported',
  'message.sent': 'Message sent',
  'money.sent': 'Money sent',
  'refund.issued': 'Refund issued',
  new_device: 'New device',
};

const td = (label: string, ...children: Array<Node | string | null>) => h('td', { 'data-label': label }, ...children);
const when = (iso: string) => h('span', { class: 'ops-nowrap', title: dateTime(iso) }, ago(iso));

function attempts(list: SignInAttempt[], withReason: boolean): HTMLElement[] {
  return list.map((a) =>
    h(
      'tr',
      {},
      td('When', when(a.at)),
      td('Account', h('span', { class: 'ops-mono' }, a.account)),
      td('From', h('span', { class: 'ops-who-two' }, h('span', {}, a.location ?? 'Unknown location'), h('span', { class: 'ops-sub num' }, a.ipMasked))),
      withReason ? td('Reason', badge(a.reason === 'rate_limited' || a.reason === 'mfa_failed' ? 'warn' : 'alert', REASON[a.reason ?? ''] ?? 'Refused')) : null,
    ),
  );
}

void boot('security:read', () => {
  const data = shared(() => getSecurityOverview());
  const since = Date.now() - 7 * 86_400_000;

  void load(region('figures'), data, (s: SecurityOverview) => {
    need('[data-storage-note]').hidden = s.storage !== 'instance';
    const m = (value: number, previous: number | null = null) => ({ value, previous, unit: 'count' as const });
    fillMetric(need('[data-metric="sessions"]'), m(s.activeSessions.length), null, 'neutral');
    fillMetric(need('[data-metric="failed"]'), m(s.failedSignIns24h, s.failedSignInsPrevious24h), '24h', 'down');
    fillMetric(need('[data-metric="signins"]'), m(s.adminSignIns7d), '7d', 'neutral');
    fillMetric(need('[data-metric="events"]'), m(s.events.filter((e) => Date.parse(e.at) > since).length), '7d', 'neutral');
    return true;
  });

  void load(region('sessions'), data, (s) => {
    need('[data-rows="sessions"]').replaceChildren(
      ...s.activeSessions.map((x) =>
        h(
          'tr',
          {},
          td('Admin', h('span', { class: 'ops-who-two' }, h('span', { class: 'ops-who-name' }, x.adminName, x.current ? ' ' : null, x.current ? badge('good', 'This session') : null), h('span', { class: 'ops-sub' }, ROLE_LABEL[x.role]))),
          td('Device', x.device),
          td('Location', x.location ?? 'Unknown'),
          td('IP', h('span', { class: 'ops-mono' }, x.ipMasked)),
          td('Started', when(x.startedAt)),
          td('Last seen', when(x.lastSeenAt)),
        ),
      ),
    );
    return s.activeSessions.length > 0;
  });

  void load(region('failed'), data, (s) => {
    need('[data-rows="failed"]').replaceChildren(...attempts(s.failedAttempts, true));
    return s.failedAttempts.length > 0;
  });

  void load(region('recent'), data, (s) => {
    need('[data-rows="recent"]').replaceChildren(...attempts(s.recentSignIns, false));
    return s.recentSignIns.length > 0;
  });

  void load(region('events'), data, (s) => {
    const list = s.events.filter((e) => Date.parse(e.at) > since);
    need('[data-events]').replaceChildren(
      ...list.map((e) =>
        h(
          'li',
          { class: 'ops-feed-item', 'data-tone': e.severity === 'critical' ? 'alert' : e.severity === 'warning' ? 'warn' : 'quiet' },
          h('time', { class: 'ops-feed-time', datetime: e.at, title: dateTime(e.at) }, ago(e.at)),
          h('span', { class: 'ops-feed-mark', 'aria-hidden': 'true' }, h('span', { class: 'ops-dot' })),
          h('span', { class: 'ops-feed-body' }, h('span', { class: 'ops-feed-text' }, h('b', {}, EVENT[e.kind]), e.detail ? ` · ${e.detail}` : ''), h('span', { class: 'ops-feed-meta' }, e.actor ? h('span', {}, e.actor) : null, h('span', {}, e.severity))),
        ),
      ),
    );
    return list.length > 0;
  });
});
