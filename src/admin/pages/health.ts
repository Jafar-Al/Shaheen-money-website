/**
 * 10 · System Health. Polls the health endpoint every minute while the page
 * is visible (never in a hidden tab), and says when it last heard back.
 */
import { getSystemHealth } from '../services/adminApi';
import type { SystemHealth } from '../types/admin';
import { SERVICE_META, SERVICE_STATUS_LABEL, TONE, dateTime } from '../lib/format';
import { h, need } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { badge } from '../ui/render';
import { boot } from '../ui/shell';
import { freshness, overallLabel, serviceRow } from './blocks';

function duration(from: string, to: string | null): string {
  const mins = Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 60_000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

void boot('system:read', () => {
  let checked: string | null = null;
  const fresh = freshness(need('[data-fresh]'), () => checked);
  const refresh = need<HTMLButtonElement>('[data-refresh]');

  const run = () => {
    const data = shared(() => getSystemHealth());
    void load(region('services'), data, (hh: SystemHealth) => {
      checked = hh.checkedAt;
      fresh();
      const overall = need('[data-overall]');
      overall.dataset.tone = TONE.service[hh.status];
      need('[data-overall-text]', overall).textContent = overallLabel(hh);
      overall.querySelector('.ops-dot')?.classList.add('ops-dot-live');
      need('[data-services]').replaceChildren(...hh.services.map((s) => serviceRow(s, { history: true })));
      return hh.services.length > 0;
    });
    void load(region('incidents'), data, (hh) => {
      const list = [...hh.incidents].sort((a, b) => Number(!!a.resolvedAt) - Number(!!b.resolvedAt) || Date.parse(b.startedAt) - Date.parse(a.startedAt));
      need('[data-incidents]').replaceChildren(
        ...list.map((i, n) =>
          h(
            'li',
            { class: 'ops-ledger-row' },
            h('span', { class: 'ops-ledger-n' }, String(n + 1).padStart(2, '0')),
            h(
              'span',
              { class: 'ops-ledger-main' },
              h('span', { class: 'ops-ledger-title' }, i.title),
              h('span', { class: 'ops-sub' }, `${SERVICE_META[i.serviceId]?.name ?? i.serviceId} · started ${dateTime(i.startedAt)}${i.resolvedAt ? ` · resolved after ${duration(i.startedAt, i.resolvedAt)}` : ` · open for ${duration(i.startedAt, null)}`}`),
            ),
            h('span', { class: 'ops-ledger-end' }, i.resolvedAt ? badge('good', 'Resolved') : badge(TONE.service[i.status], SERVICE_STATUS_LABEL[i.status], true)),
          ),
        ),
      );
      return list.length > 0;
    });
  };

  refresh.addEventListener('click', run);
  setInterval(() => {
    if (!document.hidden) run();
  }, 60_000);
  run();
});
