/**
 * The command palette (src/components/admin/CommandPalette.astro): ⌘K or
 * Ctrl K anywhere, or the search field in the top bar.
 *
 *  · "Go to": every page this admin may open (read from the sidebar, so the
 *    two can never disagree about permissions);
 *  · users, transactions and Connectors matching what is typed, from the
 *    search endpoint (src/admin/services/adminApi.ts → search), limited to
 *    what the session may read;
 *  · a few actions (temperature, sign out).
 *
 * A combobox over a listbox: the input keeps focus, ↑/↓ move the active
 * option (aria-activedescendant), Enter opens it.
 */
import { routes } from '../config';
import { search } from '../services/adminApi';
import { hasPermission } from '../services/auth';
import { isAbort } from '../services/errors';
import { FLOW_LABEL, TXN_STATUS_LABEL, USER_STATUS_LABEL, CONNECTOR_STATUS_LABEL, amount } from '../lib/format';
import { countryName } from '../lib/geo';
import { $$, debounce, h, need } from './dom';

interface Option {
  id: string;
  group: string;
  n?: string;
  title: string;
  sub?: string;
  meta?: string;
  run: () => void;
}

/** Opens a record URL: in place when it is on this page (the page listens to popstate), else by navigating. */
export function openUrl(url: string): void {
  const target = new URL(url, location.href);
  if (target.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) {
    history.pushState(null, '', target.pathname + target.search);
    dispatchEvent(new PopStateEvent('popstate'));
  } else {
    location.assign(target.pathname + target.search);
  }
}

export function initPalette(actions: { toggleTemperature: () => void; signOut: () => void }): { open: () => void } {
  const dialog = need<HTMLDialogElement>('[data-palette]');
  const input = need<HTMLInputElement>('[data-palette-input]', dialog);
  const list = need('[data-palette-list]', dialog);
  let options: Option[] = [];
  let active = 0;
  let controller: AbortController | null = null;
  let entityOptions: Option[] = [];
  let searching = false;

  const pages = (): Option[] =>
    $$<HTMLAnchorElement>('.ops-side .ops-nav-link').map((a) => ({
      id: `page-${a.dataset.navKey}`,
      group: 'Go to',
      n: a.querySelector('.ops-nav-n')?.textContent ?? '',
      title: a.querySelector('.ops-nav-label')?.textContent ?? '',
      run: () => location.assign(a.href),
    }));

  const commands = (): Option[] => [
    { id: 'cmd-temp', group: 'Actions', n: '—', title: 'Switch temperature (Night / Paper)', run: actions.toggleTemperature },
    { id: 'cmd-out', group: 'Actions', n: '—', title: 'Sign out', run: actions.signOut },
  ];

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const matches = (o: Option) => !q || o.title.toLowerCase().includes(q);
    options = [...pages().filter(matches), ...entityOptions, ...commands().filter(matches)];
    active = Math.min(active, Math.max(0, options.length - 1));
    const groups = new Map<string, Option[]>();
    for (const o of options) groups.set(o.group, [...(groups.get(o.group) ?? []), o]);

    const children: Node[] = [];
    let i = 0;
    for (const [group, items] of groups) {
      const gid = `pg-${group.replace(/\W+/g, '-').toLowerCase()}`;
      const opts = items.map((o) => {
        const index = i++;
        const el = h(
          'div',
          { id: `opt-${o.id}`, role: 'option', class: 'ops-palette-opt', 'aria-selected': String(index === active) },
          h('span', { class: 'num' }, o.n ?? ''),
          h('span', { class: 'ops-palette-main' }, h('b', {}, o.title), o.sub ? h('span', { class: 'ops-sub' }, o.sub) : null),
          o.meta ? h('span', { class: 'micro ops-sub' }, o.meta) : null,
        );
        el.addEventListener('pointermove', () => {
          if (active !== index) {
            active = index;
            mark();
          }
        });
        el.addEventListener('click', () => choose(index));
        return el;
      });
      children.push(h('div', { role: 'group', 'aria-labelledby': gid }, h('p', { id: gid, class: 'ops-palette-group label' }, group), ...opts));
    }
    if (!options.length) {
      children.push(h('p', { class: 'ops-palette-empty' }, searching ? 'Searching…' : q.length >= 2 ? `Nothing matches “${input.value.trim()}”.` : 'Type to search.'));
    } else if (searching) {
      children.push(h('p', { class: 'ops-palette-empty micro' }, 'Searching records…'));
    }
    list.replaceChildren(...children);
    mark();
  };

  const mark = () => {
    $$('[role="option"]', list).forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    const current = options[active];
    if (current) {
      input.setAttribute('aria-activedescendant', `opt-${current.id}`);
      document.getElementById(`opt-${current.id}`)?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    dialog.close();
    o.run();
  };

  const find = debounce(async (q: string) => {
    controller?.abort();
    if (q.length < 2) {
      entityOptions = [];
      searching = false;
      draw();
      return;
    }
    controller = new AbortController();
    searching = true;
    draw();
    try {
      const r = await search(q, { signal: controller.signal });
      entityOptions = [
        ...(hasPermission('users:read')
          ? r.users.map((u) => ({
              id: `u-${u.id}`,
              group: 'Users',
              n: u.country,
              title: u.name,
              sub: u.email,
              meta: USER_STATUS_LABEL[u.status],
              run: () => openUrl(`${routes.users}?user=${encodeURIComponent(u.id)}`),
            }))
          : []),
        ...(hasPermission('transactions:read')
          ? r.transactions.map((t) => ({
              id: `t-${t.id}`,
              group: 'Transactions',
              n: 'TX',
              title: t.id,
              sub: `${FLOW_LABEL[t.type]} · ${amount(t.amount, t.asset)}`,
              meta: TXN_STATUS_LABEL[t.status],
              run: () => openUrl(`${routes.transactions}?txn=${encodeURIComponent(t.id)}`),
            }))
          : []),
        ...(hasPermission('connectors:read')
          ? r.connectors.map((c) => ({
              id: `c-${c.id}`,
              group: 'Connectors',
              n: c.country,
              title: c.name,
              sub: `${c.city}, ${countryName(c.country)}`,
              meta: CONNECTOR_STATUS_LABEL[c.status],
              run: () => openUrl(`${routes.connectors}?connector=${encodeURIComponent(c.id)}`),
            }))
          : []),
      ];
    } catch (e) {
      if (isAbort(e)) return;
      entityOptions = [];
    }
    searching = false;
    active = 0;
    draw();
  }, 160);

  input.addEventListener('input', () => {
    active = 0;
    draw();
    find(input.value.trim());
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!options.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      mark();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => controller?.abort());

  const open = () => {
    if (dialog.open) return;
    input.value = '';
    entityOptions = [];
    active = 0;
    draw();
    dialog.showModal();
    input.focus();
  };

  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  });
  for (const t of $$('[data-open-palette]')) t.addEventListener('click', open);
  return { open };
}
