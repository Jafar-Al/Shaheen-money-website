/**
 * 12 · Profile & settings. Preferences are this browser's only
 * (localStorage); the session and its permissions come from the server.
 */
import { STORAGE } from '../config';
import { SCENARIOS, SCENARIO_COOKIE, isScenario } from '../mock/scenario';
import { PERMISSION_LABEL, ROLE_LABEL } from '../services/permissions';
import type { Permission } from '../types/admin';
import { dateTime } from '../lib/format';
import { h, need } from '../ui/dom';
import { badge } from '../ui/render';
import { segmented } from '../ui/segmented';
import { boot, isDemo, setDensity, setTemperature, temperature, toast, type Temperature } from '../ui/shell';

void boot('console:access', async (session) => {
  need('[data-p-name]').textContent = session.admin.name;
  need('[data-p-role]').textContent = ROLE_LABEL[session.admin.role];
  need('[data-p-email]').textContent = session.admin.email;
  need('[data-p-session]').textContent = session.sessionId;
  need('[data-p-issued]').textContent = dateTime(session.issuedAt);
  need('[data-p-expires]').textContent = dateTime(session.expiresAt);

  const all = Object.keys(PERMISSION_LABEL) as Permission[];
  need('[data-perms]').replaceChildren(
    ...all.map((p) =>
      h(
        'li',
        { class: 'ops-perm' },
        h('span', {}, PERMISSION_LABEL[p], h('span', { class: 'ops-code' }, p)),
        session.permissions.includes(p) ? badge('good', 'Granted') : badge('muted', 'Not granted'),
      ),
    ),
  );

  const temp = segmented('pref-temperature');
  temp.set(temperature(), false);
  temp.onChange((v) => setTemperature(v as Temperature));
  addEventListener('ops:temperature', (e) => temp.set((e as CustomEvent<Temperature>).detail, false));

  const density = segmented('pref-density');
  density.set(document.documentElement.dataset.density === 'compact' ? 'compact' : 'comfortable', false);
  density.onChange((v) => setDensity(v as 'comfortable' | 'compact'));

  const sidebar = segmented('pref-sidebar');
  sidebar.set(document.documentElement.dataset.sidebar === 'rail' ? 'rail' : 'full', false);
  sidebar.onChange((v) => {
    document.documentElement.dataset.sidebar = v;
    try {
      if (v === 'rail') localStorage.setItem(STORAGE.sidebar, 'rail');
      else localStorage.removeItem(STORAGE.sidebar);
    } catch {
      /* this page only */
    }
  });

  if (!isDemo(session)) {
    need('[data-api-base]').textContent = 'Every figure is read from the Shaheen app’s database by this site’s server, after it checks your session and role.';
    return;
  }

  // Demo data only: a cookie the demo source reads on the server. The real source ignores it.
  const read = () => {
    const v = document.cookie.match(new RegExp(`(?:^|; )${SCENARIO_COOKIE}=([^;]*)`))?.[1];
    return isScenario(v) ? v : 'normal';
  };
  const write = (v: string) => {
    document.cookie = v === 'normal' ? `${SCENARIO_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict` : `${SCENARIO_COOKIE}=${v}; Path=/; SameSite=Strict`;
  };
  const scenario = segmented('scenario');
  const hint = need('[data-scenario-hint]');
  const show = (id: string) => (hint.textContent = SCENARIOS.find((s) => s.id === id)?.hint ?? '');
  scenario.set(read(), false);
  show(read());
  scenario.onChange((v) => {
    write(v);
    show(v);
    toast(`Demo scenario: ${SCENARIOS.find((s) => s.id === v)?.label}. Every page now uses it.`);
  });
});
