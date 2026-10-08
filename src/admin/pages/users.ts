/**
 * 02 · Users. Filters, sort, page and the open record are in the address
 * bar. Paging, search and masking happen on the server (users:read_pii
 * decides whether emails arrive in full); the drawer never shows passwords,
 * keys or tokens because the API never sends them.
 */
import { getUserSummary, getUsers } from '../services/adminApi';
import type { AdminUser, SortDir, UserQuery, UserSortKey, UserStatus } from '../types/admin';
import { TONE, USER_STATUS_LABEL, WALLET_STATUS_LABEL, ago, date, dateTime } from '../lib/format';
import { countryName } from '../lib/geo';
import { debounce, h, need } from '../ui/dom';
import { load, region } from '../ui/region';
import { badge, country, fillMetric, who } from '../ui/render';
import { drawerFromUrl, openFromRow, openUser, userHref } from './records';
import { segmented } from '../ui/segmented';
import { boot, exportButton } from '../ui/shell';
import { dataTable } from '../ui/table';
import { oneOf, param, setParams } from '../ui/url';

const STATUSES = ['', 'active', 'inactive', 'pending', 'suspended'] as const;
const SORTS = ['name', 'country', 'joinedAt', 'status', 'lastActiveAt'] as const;
const PAGE_SIZE = 25;

void boot('users:read', () => {
  const q: UserQuery = {
    page: Math.max(1, Number(param('page')) || 1),
    pageSize: PAGE_SIZE,
    search: param('q') ?? undefined,
    status: (oneOf(param('status'), STATUSES, '') || undefined) as UserStatus | undefined,
    country: param('country') ?? undefined,
    sort: oneOf(param('sort'), SORTS, 'joinedAt') as UserSortKey,
    dir: oneOf(param('dir'), ['asc', 'desc'] as const, 'desc') as SortDir,
  };
  const search = need<HTMLInputElement>('[data-search]');
  const countrySel = need<HTMLSelectElement>('[data-country]');
  const status = segmented('status');
  const table = dataTable<AdminUser>('users');
  const rows = region('users-rows');
  search.value = q.search ?? '';
  status.set(q.status ?? '', false);
  table.setSort(q.sort!, q.dir!);

  const sync = () =>
    setParams({
      q: q.search,
      status: q.status,
      country: q.country,
      sort: q.sort === 'joinedAt' ? null : q.sort,
      dir: q.dir === 'desc' ? null : q.dir,
      page: q.page > 1 ? q.page : null,
    });

  const loadRows = () => {
    sync();
    void load(
      rows,
      (signal) => getUsers(q, { signal }),
      (page) => {
        q.page = page.page;
        table.setRows(
          page,
          [
            { label: 'User', cell: (u) => who(u.name, u.email, { href: userHref(u.id) }) },
            { label: 'Country', cell: (u) => country(u.country) },
            { label: 'Joined', cell: (u) => h('span', { title: dateTime(u.joinedAt) }, date(u.joinedAt)) },
            { label: 'Status', cell: (u) => badge(TONE.user[u.status], USER_STATUS_LABEL[u.status]) },
            { label: 'Last activity', cell: (u) => h('span', { title: u.lastActiveAt ? dateTime(u.lastActiveAt) : 'Never' }, ago(u.lastActiveAt)) },
            { label: 'Wallet', cell: (u) => (u.walletStatus ? badge(TONE.wallet[u.walletStatus], WALLET_STATUS_LABEL[u.walletStatus]) : '—') },
          ],
          (u) => userHref(u.id),
        );
        return page.items.length > 0;
      },
    );
  };

  void load(
    region('summary'),
    (signal) => getUserSummary({ signal }),
    (s) => {
      fillMetric(need('[data-metric="total"]'), s.total, '30d');
      fillMetric(need('[data-metric="new30d"]'), s.new30d, '30d');
      fillMetric(need('[data-metric="active30d"]'), s.active30d, '30d');
      fillMetric(need('[data-metric="inactive"]'), s.inactive, '30d', 'down');
      countrySel.replaceChildren(h('option', { value: '' }, 'All countries'), ...s.countries.map((c) => h('option', { value: c }, countryName(c))));
      countrySel.value = q.country ?? '';
      return s.total.value > 0;
    },
  );

  search.addEventListener(
    'input',
    debounce(() => {
      q.search = search.value.trim() || undefined;
      q.page = 1;
      loadRows();
    }, 250),
  );
  status.onChange((v) => {
    q.status = (v || undefined) as UserStatus | undefined;
    q.page = 1;
    loadRows();
  });
  countrySel.addEventListener('change', () => {
    q.country = countrySel.value || undefined;
    q.page = 1;
    loadRows();
  });
  table.onSort((key, dir) => {
    q.sort = key as UserSortKey;
    q.dir = dir;
    q.page = 1;
    loadRows();
  });
  table.onPage((p) => {
    q.page = p;
    loadRows();
  });
  table.onOpen(openFromRow);

  exportButton('users', 'users:export', () => {
    const f: Record<string, string> = {};
    if (q.search) f.search = q.search;
    if (q.status) f.status = q.status;
    if (q.country) f.country = q.country;
    return f;
  });

  loadRows();
  drawerFromUrl('user', openUser);
});
