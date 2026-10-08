/**
 * Every console page starts here (boot): it asks the auth layer for the
 * session before showing anything, sends a visitor without one to sign-in,
 * shows a role without the page's permission a refusal instead of the page,
 * and then wires the shell: navigation, the command palette, temperature,
 * the system status pill, sign-out, and the session's expiry.
 *
 * This decides what the browser shows; the API decides what data exists for
 * this session. Both are needed, and only the second is security.
 */
import { routes, STORAGE } from '../config';
import { exportData, getSystemHealth } from '../services/adminApi';
import { getSession, onSessionLost, refreshSession, signOut } from '../services/auth';
import { can, ROLE_LABEL } from '../services/permissions';
import type { AdminSession, ExportKind, Permission } from '../types/admin';
import { SERVICE_STATUS_LABEL, TONE, initials, num, time } from '../lib/format';
import { download } from '../lib/csv';
import { $, $$, h, need } from './dom';
import { initPalette } from './palette';
import { segmented } from './segmented';

const root = document.documentElement;

export type Temperature = 'night' | 'paper';

function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* preferences are a convenience: without storage they last for the page */
  }
}

export function setTemperature(t: Temperature): void {
  root.classList.toggle('t-night', t === 'night');
  root.classList.toggle('t-paper', t === 'paper');
  root.style.colorScheme = t === 'night' ? 'dark' : 'light';
  store(STORAGE.temperature, t);
  for (const el of $$('[data-seg="temperature"]')) {
    el.dataset.value = t;
  }
  dispatchEvent(new CustomEvent('ops:temperature', { detail: t }));
}

export const temperature = (): Temperature => (root.classList.contains('t-paper') ? 'paper' : 'night');

export function setDensity(d: 'comfortable' | 'compact'): void {
  root.dataset.density = d;
  store(STORAGE.density, d === 'compact' ? d : null);
}

export function toast(message: string): void {
  const region = $('[data-toasts]');
  if (!region) return;
  const el = h('p', { class: 'ops-toast' }, message);
  region.append(el);
  setTimeout(() => el.remove(), 4200);
}

const signInUrl = (reason?: string) => {
  const next = location.pathname + location.search;
  const p = new URLSearchParams({ ...(reason ? { reason } : {}), next });
  return `${routes.signIn}?${p.toString()}`;
};

async function doSignOut(): Promise<void> {
  await signOut();
  location.replace(`${routes.signIn}?reason=signed-out`);
}

function denied(permission: Permission): void {
  const main = need('#main');
  main.replaceChildren(
    h(
      'div',
      { class: 'ops-denied' },
      h(
        'div',
        {},
        h('p', { class: 'label ops-head-meta' }, 'Not available for your role'),
        h('h1', { class: 'ops-title' }, 'This page is outside your access.'),
        h('p', { class: 'ops-lead' }, `It needs the “${permission}” permission. An administrator can change your role; the Shaheen API refuses this data to your session either way.`),
        h('p', {}, h('a', { class: 'ops-link', href: routes.commandCenter }, 'Back to the Command Center')),
      ),
    ),
  );
}

function initStatusPill(): void {
  const pill = $<HTMLAnchorElement>('[data-status-pill]');
  if (!pill) return;
  if (!can(currentSessionRef, 'system:read')) {
    pill.hidden = true;
    return;
  }
  const text = need('[data-status-text]', pill);
  const update = async () => {
    try {
      const health = await getSystemHealth();
      const tone = TONE.service[health.status];
      pill.dataset.tone = tone;
      const label = health.status === 'operational' ? 'All systems operational' : health.status === 'degraded' ? 'Some systems degraded' : 'Service disruption';
      text.textContent = label;
      pill.title = `${SERVICE_STATUS_LABEL[health.status]} · checked ${time(health.checkedAt)}`;
      pill.querySelector('.ops-dot')?.classList.toggle('ops-dot-live', true);
      dispatchEvent(new CustomEvent('ops:health', { detail: health }));
    } catch {
      pill.dataset.tone = 'muted';
      text.textContent = 'Status unavailable';
      dispatchEvent(new CustomEvent('ops:health', { detail: null }));
    }
  };
  void update();
  setInterval(() => {
    if (!document.hidden) void update();
  }, 60_000);
}

let currentSessionRef: AdminSession | null = null;

function scheduleExpiry(session: AdminSession): void {
  const left = Date.parse(session.expiresAt) - Date.now();
  // Ask for more time five minutes before the end; if refused, end cleanly.
  const at = Math.max(5_000, left - 5 * 60_000);
  setTimeout(async () => {
    const next = await refreshSession().catch(() => null);
    if (next) {
      currentSessionRef = next;
      scheduleExpiry(next);
    } else {
      setTimeout(() => location.replace(signInUrl('expired')), Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    }
  }, Math.min(at, 2 ** 31 - 1));
}

function initNav(session: AdminSession): void {
  for (const link of $$<HTMLElement>('[data-permission]')) {
    if (!can(session, link.dataset.permission as Permission)) link.closest('li')?.remove();
  }
  // A group left with no links goes too.
  for (const group of $$('.ops-nav-section')) if (!group.querySelector('li')) group.remove();

  for (const el of $$('[data-me-name]')) el.textContent = session.admin.name;
  for (const el of $$('[data-me-role]')) el.textContent = ROLE_LABEL[session.admin.role];
  for (const el of $$('[data-me-initials]')) el.textContent = initials(session.admin.name);
  for (const el of $$('[data-sign-out]')) el.addEventListener('click', () => void doSignOut());
  for (const el of $$('[data-kbd]')) el.textContent = root.dataset.mac === '1' ? '⌘ K' : 'Ctrl K';

  const sheet = $<HTMLDialogElement>('[data-sheet]');
  $('[data-open-sheet]')?.addEventListener('click', () => sheet?.showModal());
  $('[data-close-sheet]')?.addEventListener('click', () => sheet?.close());
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close();
  });

  $('[data-collapse]')?.addEventListener('click', (e) => {
    const rail = root.dataset.sidebar !== 'rail';
    root.dataset.sidebar = rail ? 'rail' : 'full';
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(rail));
    store(STORAGE.sidebar, rail ? 'rail' : null);
  });

  for (const el of $$('[data-seg="temperature"]')) {
    el.dataset.value = temperature();
  }
  if ($('[data-seg="temperature"]')) {
    const seg = segmented('temperature');
    seg.onChange((v) => setTemperature(v as Temperature));
    addEventListener('ops:temperature', (e) => seg.set((e as CustomEvent<Temperature>).detail, false));
  }
}

/** Wires an [data-export="kind"] button: hidden without the permission, a CSV of the current filters when clicked. */
export function exportButton(kind: ExportKind, permission: Permission, filters: () => Record<string, string>): void {
  const button = $<HTMLButtonElement>(`[data-export="${kind}"]`);
  if (!button) return;
  if (!can(currentSessionRef, permission)) {
    button.hidden = true;
    return;
  }
  const label = button.querySelector('[data-label]') ?? button;
  const idle = label.textContent;
  button.addEventListener('click', async () => {
    button.disabled = true;
    label.textContent = 'Preparing…';
    try {
      const file = await exportData(kind, filters());
      download(file.blob, file.filename);
      toast(file.rows >= 0 ? `Exported ${num(file.rows)} rows · ${file.filename}` : `Exported ${file.filename}`);
    } catch {
      toast('The export could not be prepared. Try again in a moment.');
    } finally {
      button.disabled = false;
      label.textContent = idle;
    }
  });
}

export const session = () => currentSessionRef;

/** Whether the figures are generated demo data (ADMIN_DATA_SOURCE=demo on the server). */
export const isDemo = (s: AdminSession | null = currentSessionRef) => s?.dataSource === 'demo';

/** Shows [data-mock-only] (the "Mock data" stamps) for demo data and [data-live-only] otherwise, templates included. */
export function showDataSource(s: AdminSession | null = currentSessionRef): void {
  const demo = isDemo(s);
  const roots: ParentNode[] = [document, ...$$<HTMLTemplateElement>('template').map((t) => t.content)];
  for (const r of roots) {
    for (const el of r.querySelectorAll<HTMLElement>('[data-mock-only]')) el.hidden = !demo;
    for (const el of r.querySelectorAll<HTMLElement>('[data-live-only]')) el.hidden = demo;
  }
}

/**
 * Starts a page. `permission` is what the page needs; `run` builds it once
 * the session is known and allowed.
 */
export async function boot(permission: Permission, run: (session: AdminSession) => void | Promise<void>): Promise<void> {
  onSessionLost(() => location.replace(signInUrl('expired')));

  let s: AdminSession | null;
  try {
    s = await getSession();
  } catch {
    const gate = need('.ops-gate');
    gate.replaceChildren(
      h('p', { class: 'ops-title' }, 'The sign-in service did not answer.'),
      h('p', { class: 'ops-lead' }, 'Nothing is shown until your session can be checked.'),
      h('button', { type: 'button', class: 'ops-btn', 'data-reload': '' }, 'Try again'),
    );
    gate.querySelector('[data-reload]')?.addEventListener('click', () => location.reload());
    return;
  }
  if (!s) {
    location.replace(signInUrl());
    return;
  }
  if (!can(s, 'console:access')) {
    await signOut().catch(() => undefined);
    location.replace(`${routes.signIn}?reason=forbidden`);
    return;
  }
  currentSessionRef = s;
  initNav(s);
  initPalette({ toggleTemperature: () => setTemperature(temperature() === 'night' ? 'paper' : 'night'), signOut: () => void doSignOut() });
  initStatusPill();
  scheduleExpiry(s);
  // Sections that need more than the page does (the network on the Command Center…).
  for (const el of $$<HTMLElement>('[data-requires]')) if (!can(s, el.dataset.requires as Permission)) el.remove();
  // Generated data says so on every screen: the server reports where the figures come from.
  showDataSource(s);

  root.dataset.auth = 'ready';
  if (!can(s, permission)) {
    denied(permission);
    return;
  }
  await run(s);
}
