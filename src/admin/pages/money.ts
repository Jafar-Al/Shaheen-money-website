/**
 * 06 · Money Movement: the route, each step in figures, and each step over
 * time. One period scopes all three.
 */
import { getMoneyMovement } from '../services/adminApi';
import type { FlowType, MoneyMovement, Range } from '../types/admin';
import { FLOW_LABEL, comparisonLabel, num, pct, usd } from '../lib/format';
import { h, need } from '../ui/dom';
import { load, region, shared } from '../ui/region';
import { deltaEl } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';
import { fillFlow, txnBlock } from './blocks';

const RANGES = ['24h', '7d', '30d', '90d'] as const;
const TYPES = ['all', 'receive', 'send', 'payment', 'cash_out'] as const;

function steps(mm: MoneyMovement): boolean {
  const out: FlowType[] = ['send', 'payment', 'cash_out'];
  const outflow = out.reduce((n, t) => n + mm.stages[t].volumeUsd, 0);
  const rows = (['receive', 'send', 'payment', 'cash_out'] as FlowType[]).map((t) => {
    const st = mm.stages[t];
    return h(
      'tr',
      { class: t === 'cash_out' ? 'is-cash' : null },
      h('td', { 'data-label': 'Step' }, h('span', { class: 'ops-badge', 'data-tone': t === 'cash_out' ? 'cash' : 'good' }, h('span', { class: 'ops-dot', 'aria-hidden': 'true' }), FLOW_LABEL[t])),
      h('td', { class: 'is-num', 'data-label': 'Volume' }, usd(st.volumeUsd)),
      h('td', { class: 'is-num', 'data-label': 'Transactions' }, num(st.count)),
      h('td', { class: 'is-num', 'data-label': 'Average' }, st.count ? usd(st.volumeUsd / st.count, { cents: true }) : '—'),
      h('td', { class: 'is-num', 'data-label': 'Share of outflow' }, t === 'receive' ? 'Inflow' : outflow ? pct((st.volumeUsd / outflow) * 100) : '—'),
      h('td', { class: 'is-num', 'data-label': 'Change' }, deltaEl(st.volumeUsd, st.previousVolumeUsd, '')),
    );
  });
  need('[data-steps]').replaceChildren(...rows);
  return Object.values(mm.stages).some((s) => s.count > 0);
}

void boot('transactions:read', () => {
  let range: Range = oneOf(param('range'), RANGES, '30d');
  const seg = segmented('range');
  seg.set(range, false);
  const analytics = txnBlock('txn', oneOf(param('step'), TYPES, 'receive'));

  const run = () => {
    const mm = shared(() => getMoneyMovement(range));
    const flowRegion = region('flow');
    void load(flowRegion, mm, (m) => fillFlow(flowRegion.content, m));
    void load(region('steps'), mm, (m) => {
      need('#steps [data-lead]').textContent = `Completed transactions only, ${comparisonLabel(range).replace('vs', 'with the change vs')}.`;
      return steps(m);
    });
    analytics.load(range);
  };
  seg.onChange((v) => {
    range = v as Range;
    setParams({ range: range === '30d' ? null : range });
    run();
  });
  run();
});
