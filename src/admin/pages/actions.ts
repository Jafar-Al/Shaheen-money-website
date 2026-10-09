/**
 * 08 · Actions. Messages, SMS and push notifications to users; money from the
 * master wallet; refunds. The server checks everything again: the permission,
 * every field, the confirmation, the authenticator code, the idempotency key.
 * This page only makes the action clear before it is confirmed.
 *
 * Opened from a record: ?message=<user id>, ?to=<user id> (money) or
 * ?refund=<transaction id> fills the matching form.
 */
import { getTransactionById, getUserById, search } from '../services/adminApi';
import { countAudience, getMasterWallet, getRecentActions, issueRefund, newIdempotencyKey, sendMessage, sendMoney } from '../services/actions';
import { ApiError } from '../services/errors';
import type { Audience, Channel, Transaction } from '../types/admin';
import { FLOW_LABEL, TXN_STATUS_LABEL, ago, amount, dateTime, num, usd } from '../lib/format';
import { countryName } from '../lib/geo';
import { $, $$, debounce, h, need } from '../ui/dom';
import { segmented } from '../ui/segmented';
import { boot, session, toast } from '../ui/shell';
import { param } from '../ui/url';

const CHANNEL_WORD: Record<Channel, string> = { in_app: 'In-app message', sms: 'SMS', push: 'Push notification' };
const LIMIT: Record<Channel, number> = { in_app: 1000, sms: 480, push: 1000 };
const AMOUNT = /^\d{1,15}(\.\d{1,6})?$/;

const message = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again in a moment.');

function fieldError(input: HTMLInputElement | HTMLTextAreaElement, text: string | null): void {
  const field = input.closest('.field');
  const box = field?.querySelector<HTMLElement>('[data-error]');
  const hint = field?.querySelector<HTMLElement>('[data-hint]');
  if (!box) return;
  box.hidden = !text;
  need('[data-error-text]', box).textContent = text ?? '';
  if (hint) hint.hidden = !!text;
  input.setAttribute('aria-invalid', text ? 'true' : 'false');
}

// ── Choosing users ───────────────────────────────────────────────────────
interface Picker {
  ids: () => string[];
  labels: () => string[];
  add: (id: string, label: string) => void;
  clear: () => void;
}

function picker(root: HTMLElement, multi: boolean, onChange: () => void): Picker {
  const input = need<HTMLInputElement>('input', root);
  const results = need<HTMLUListElement>('[data-results]', root);
  const chips = need<HTMLUListElement>('[data-chips]', root);
  const chosen = new Map<string, string>();

  const render = () => {
    chips.replaceChildren(
      ...[...chosen].map(([id, label]) =>
        h(
          'li',
          { class: 'ops-chip' },
          h('span', {}, label, h('span', { class: 'ops-sub num' }, ` ${id}`)),
          h('button', { type: 'button', class: 'ops-chip-x', 'aria-label': `Remove ${label}`, 'data-remove': id }, '×'),
        ),
      ),
    );
    onChange();
  };
  const add = (id: string, label: string) => {
    if (!multi) chosen.clear();
    if (chosen.size >= 500) return toast('At most 500 users at once: choose countries or continents for more.');
    chosen.set(id, label);
    results.replaceChildren();
    input.value = '';
    fieldError(input, null);
    render();
  };
  chips.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]')?.dataset.remove;
    if (!id) return;
    chosen.delete(id);
    render();
  });

  const find = debounce(async (q: string) => {
    if (q.trim().length < 2) return results.replaceChildren();
    try {
      const res = await search(q.trim());
      results.replaceChildren(
        ...(res.users.length
          ? res.users.map((u) =>
              h(
                'li',
                {},
                h(
                  'button',
                  { type: 'button', class: 'ops-pick-opt', 'data-id': u.id, 'data-label': u.name },
                  h('span', { class: 'ops-who-name' }, u.name),
                  h('span', { class: 'ops-sub' }, ` ${u.id} · ${countryName(u.country)}`),
                ),
              ),
            )
          : [h('li', { class: 'ops-sub' }, 'No user matches.')]),
      );
    } catch {
      results.replaceChildren(h('li', { class: 'ops-sub' }, 'Search is not available right now.'));
    }
  }, 250);
  input.addEventListener('input', () => find(input.value));
  results.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (b) add(b.dataset.id!, b.dataset.label!);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    $<HTMLButtonElement>('[data-id]', results)?.click();
  });

  return { ids: () => [...chosen.keys()], labels: () => [...chosen.values()], add, clear: () => (chosen.clear(), render()) };
}

// ── The confirmation dialog ──────────────────────────────────────────────
interface Confirm {
  title: string;
  lines: Array<[string, string]>;
  /** Money and refunds: the server may ask for an authenticator code. */
  money: boolean;
  run: (code: string | undefined) => Promise<void>;
}

function confirmation(): (c: Confirm) => void {
  const dialog = need<HTMLDialogElement>('[data-confirm]');
  const title = need('[data-confirm-title]', dialog);
  const lines = need('[data-confirm-lines]', dialog);
  const codeBox = need('[data-confirm-code]', dialog);
  const code = need<HTMLInputElement>('input', codeBox);
  const status = need('[data-confirm-status]', dialog);
  const ok = need<HTMLButtonElement>('[data-confirm-ok]', dialog);
  const cancel = need<HTMLButtonElement>('[data-confirm-cancel]', dialog);
  let current: Confirm | null = null;

  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => (current = null));
  ok.addEventListener('click', async () => {
    if (!current) return;
    const value = code.value.replace(/\s/g, '');
    if (!codeBox.hidden && !/^\d{6}$/.test(value)) {
      fieldError(code, 'Enter the 6 digits your authenticator app shows.');
      return code.focus();
    }
    ok.disabled = cancel.disabled = true;
    status.textContent = 'Working…';
    try {
      await current.run(codeBox.hidden ? undefined : value);
      dialog.close();
    } catch (err) {
      const reason = err instanceof ApiError ? err.reason : undefined;
      code.value = '';
      if (reason === 'code_required' || reason === 'code_invalid') {
        codeBox.hidden = false;
        code.focus();
      }
      status.textContent = message(err);
    } finally {
      ok.disabled = cancel.disabled = false;
    }
  });

  return (c) => {
    current = c;
    title.textContent = c.title;
    lines.replaceChildren(...c.lines.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))));
    // An account with a second factor confirms money with a fresh code.
    codeBox.hidden = !(c.money && session()?.secondFactor);
    code.value = '';
    fieldError(code, null);
    status.textContent = '';
    ok.textContent = c.money ? 'Confirm and send' : 'Send';
    dialog.showModal();
    (codeBox.hidden ? ok : code).focus();
  };
}

// ── Messages ─────────────────────────────────────────────────────────────
function messages(confirm: (c: Confirm) => void, refresh: () => void): void {
  const form = need<HTMLFormElement>('[data-form="message"]');
  const channel = segmented('channel', form);
  const audience = segmented('audience', form);
  const titleBox = need('[data-title-field]', form);
  const title = need<HTMLInputElement>('#f-message-title', form);
  const body = need<HTMLTextAreaElement>('#f-message-body', form);
  const chars = need('[data-chars]', form);
  const reach = need('[data-reach]', form);
  let reachCount: number | null = null;

  const currentChannel = () => (form.querySelector<HTMLElement>('[data-seg="channel"]')?.dataset.value ?? 'in_app') as Channel;
  const currentAudience = () => form.querySelector<HTMLElement>('[data-seg="audience"]')?.dataset.value ?? 'users';
  const checked = (name: string) => $$<HTMLInputElement>(`input[name="${name}"]:checked`, form).map((i) => i.value);

  const recount = debounce(async () => {
    const a = build();
    if (!a) {
      reachCount = null;
      reach.textContent = '';
      return;
    }
    reach.textContent = 'Counting recipients…';
    try {
      reachCount = await countAudience(currentChannel(), a);
      reach.textContent = `Reaches ${num(reachCount)} ${reachCount === 1 ? 'person' : 'people'}.`;
    } catch (err) {
      reachCount = null;
      reach.textContent = message(err);
    }
  }, 300);

  const users = picker(need('[data-picker="message"]', form), true, recount);

  function build(): Audience | null {
    const kind = currentAudience();
    if (kind === 'users') return users.ids().length ? { kind: 'users', userIds: users.ids() } : null;
    if (kind === 'countries') return checked('country').length ? { kind: 'countries', countries: checked('country') } : null;
    return checked('continent').length ? { kind: 'continents', continents: checked('continent') as Extract<Audience, { kind: 'continents' }>['continents'] } : null;
  }

  const sync = () => {
    const ch = currentChannel();
    titleBox.hidden = ch === 'sms';
    body.maxLength = LIMIT[ch];
    chars.textContent = `${num(body.value.length)} / ${num(LIMIT[ch])} characters${ch === 'sms' ? ' (up to three text messages)' : ''}`;
  };
  channel.onChange(() => {
    sync();
    recount();
  });
  audience.onChange((v) => {
    for (const el of $$<HTMLElement>('[data-aud]', form)) el.hidden = el.dataset.aud !== v;
    recount();
  });
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).type === 'checkbox') recount();
  });
  body.addEventListener('input', sync);
  sync();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ch = currentChannel();
    const a = build();
    const text = body.value.trim();
    const head = title.value.trim();
    let bad = false;
    if (!text) (fieldError(body, 'Write the message.'), (bad = true));
    else if (text.length > LIMIT[ch]) (fieldError(body, `At most ${LIMIT[ch]} characters for this channel.`), (bad = true));
    else fieldError(body, null);
    if (ch === 'push' && !head) (fieldError(title, 'A push notification needs a title.'), (bad = true));
    else fieldError(title, null);
    if (!a) {
      toast(currentAudience() === 'users' ? 'Choose at least one user.' : 'Choose at least one.');
      bad = true;
    }
    if (bad || !a) return;
    const to =
      a.kind === 'users'
        ? users.labels().length <= 3
          ? users.labels().join(', ')
          : `${users.labels().slice(0, 3).join(', ')} and ${users.labels().length - 3} more`
        : a.kind === 'countries'
          ? a.countries.map(countryName).join(', ')
          : a.continents.join(', ');
    confirm({
      title: `Send this ${CHANNEL_WORD[ch].toLowerCase()}?`,
      money: false,
      lines: [
        ['Channel', CHANNEL_WORD[ch]],
        ['To', to],
        ['Recipients', reachCount === null ? 'Counted when sent' : num(reachCount)],
        ...(head && ch !== 'sms' ? ([['Title', head]] as Array<[string, string]>) : []),
        ['Message', text.length > 160 ? `${text.slice(0, 160)}…` : text],
      ],
      run: async () => {
        const res = await sendMessage({ channel: ch, audience: a, ...(head && ch !== 'sms' ? { title: head } : {}), body: text });
        toast(`Sent to ${num(res.recipients)} ${res.recipients === 1 ? 'person' : 'people'}.`);
        body.value = '';
        title.value = '';
        users.clear();
        sync();
        refresh();
      },
    });
  });

  const preset = param('message');
  if (preset) void getUserById(preset).then((u) => users.add(u.id, u.name)).catch(() => toast('That user could not be found.'));
}

// ── Money ────────────────────────────────────────────────────────────────
function moneyForm(confirm: (c: Confirm) => void, refresh: () => void): () => void {
  const form = need<HTMLFormElement>('[data-form="money"]');
  const wallet = need('[data-wallet]');
  const asset = need<HTMLSelectElement>('#f-money-asset', form);
  const amt = need<HTMLInputElement>('#f-money-amount', form);
  const note = need<HTMLInputElement>('#f-money-note', form);
  const to = picker(need('[data-picker="money"]', form), false, () => undefined);
  let key = newIdempotencyKey();

  const loadWallet = async () => {
    try {
      const w = await getMasterWallet();
      wallet.replaceChildren(
        h('div', {}, h('dt', {}, 'Master wallet'), h('dd', { class: 'ops-sub' }, `As of ${dateTime(w.generatedAt)}`)),
        ...w.balances.map((b) => h('div', {}, h('dt', {}, b.asset), h('dd', { class: 'num' }, amount(b.amount, b.asset), h('span', { class: 'ops-sub' }, ` · ${usd(Number(b.usdValue))}`)))),
      );
    } catch (err) {
      wallet.replaceChildren(h('div', {}, h('dt', {}, 'Master wallet'), h('dd', { class: 'ops-sub' }, message(err))));
    }
  };
  void loadWallet();

  // A changed form is a new request; a retried one keeps its key (never paid twice).
  form.addEventListener('input', () => (key = newIdempotencyKey()));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = amt.value.trim().replace(/,/g, '');
    const userId = to.ids()[0];
    let bad = false;
    if (!userId) (fieldError(need('input', need('[data-picker="money"]', form)), 'Choose who receives it.'), (bad = true));
    if (!AMOUNT.test(value) || Number(value) <= 0) (fieldError(amt, 'Enter a positive amount, like 250 or 99.50.'), (bad = true));
    else fieldError(amt, null);
    if (bad || !userId) return;
    const name = to.labels()[0]!;
    confirm({
      title: `Send ${amount(value, asset.value)}?`,
      money: true,
      lines: [
        ['From', 'The master wallet'],
        ['To', `${name} (${userId})`],
        ['Amount', amount(value, asset.value)],
        ...(note.value.trim() ? ([['Note', note.value.trim()]] as Array<[string, string]>) : []),
      ],
      run: async (code) => {
        const res = await sendMoney({ userId, asset: asset.value, amount: value, ...(note.value.trim() ? { note: note.value.trim() } : {}), idempotencyKey: key, ...(code ? { code } : {}) });
        toast(`Sent ${amount(value, asset.value)} to ${name}. Transaction ${res.transactionId}.`);
        amt.value = '';
        note.value = '';
        to.clear();
        key = newIdempotencyKey();
        void loadWallet();
        refresh();
      },
    });
  });

  const preset = param('to');
  if (preset) void getUserById(preset).then((u) => to.add(u.id, u.name)).catch(() => toast('That user could not be found.'));
  return loadWallet;
}

// ── Refunds ──────────────────────────────────────────────────────────────
function refundForm(confirm: (c: Confirm) => void, refresh: () => void): void {
  const form = need<HTMLFormElement>('[data-form="refund"]');
  const id = need<HTMLInputElement>('#f-refund-txn', form);
  const found = need('[data-txn]', form);
  const amt = need<HTMLInputElement>('#f-refund-amount', form);
  const reason = need<HTMLTextAreaElement>('#f-refund-reason', form);
  let txn: Transaction | null = null;
  let key = newIdempotencyKey();

  const find = async () => {
    const value = id.value.trim();
    txn = null;
    found.hidden = true;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) return fieldError(id, 'Enter a transaction ID, e.g. txn_…');
    try {
      txn = await getTransactionById(value);
      fieldError(id, null);
      found.replaceChildren(
        ...(
          [
            ['Transaction', `${FLOW_LABEL[txn.type]} of ${amount(txn.amount, txn.asset)}`],
            ['From', txn.from.name],
            ['To', txn.to.name],
            ['Status', TXN_STATUS_LABEL[txn.status]],
            ['Created', `${dateTime(txn.createdAt)} (${ago(txn.createdAt)})`],
          ] as Array<[string, string]>
        ).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v))),
      );
      found.hidden = false;
      amt.placeholder = txn.amount;
    } catch (err) {
      fieldError(id, err instanceof ApiError && err.code === 'not_found' ? 'There is no transaction with that ID.' : message(err));
    }
  };
  need('[data-find-txn]', form).addEventListener('click', () => void find());
  id.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void find();
    }
  });
  form.addEventListener('input', () => (key = newIdempotencyKey()));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!txn || txn.id !== id.value.trim()) await find();
    if (!txn) return;
    const value = amt.value.trim().replace(/,/g, '');
    let bad = false;
    if (value && (!AMOUNT.test(value) || Number(value) <= 0)) (fieldError(amt, 'Enter a positive amount, or leave it empty for the full amount.'), (bad = true));
    else fieldError(amt, null);
    if (!reason.value.trim()) (fieldError(reason, 'Say why: the complaint and its reference.'), (bad = true));
    else fieldError(reason, null);
    if (bad) return;
    const t = txn;
    const how = value ? amount(value, t.asset) : `${amount(t.amount, t.asset)} (the full amount)`;
    confirm({
      title: `Refund ${value ? amount(value, t.asset) : 'the full amount'}?`,
      money: true,
      lines: [
        ['Transaction', `${t.id} · ${FLOW_LABEL[t.type]} of ${amount(t.amount, t.asset)}`],
        ['Back to', t.from.name],
        ['Refund', how],
        ['Reason', reason.value.trim()],
      ],
      run: async (code) => {
        const res = await issueRefund({ transactionId: t.id, ...(value ? { amount: value } : {}), reason: reason.value.trim(), idempotencyKey: key, ...(code ? { code } : {}) });
        toast(`Refunded ${how}. Transaction ${res.transactionId}.`);
        amt.value = '';
        reason.value = '';
        key = newIdempotencyKey();
        refresh();
      },
    });
  });

  const preset = param('refund');
  if (preset) {
    id.value = preset;
    void find();
  }
}

// ── The log ──────────────────────────────────────────────────────────────
const KIND_WORD = { message: 'Message', money: 'Money sent', refund: 'Refund' } as const;

async function recent(): Promise<void> {
  const box = need('[data-recent]');
  try {
    const items = await getRecentActions();
    box.replaceChildren(
      items.length
        ? h(
            'ul',
            { class: 'ops-ledger' },
            ...items.map((a) =>
              h(
                'li',
                { class: 'ops-ledger-row no-n' },
                h('span', { class: 'ops-ledger-main' }, h('span', { class: 'ops-ledger-title' }, a.detail), h('span', { class: 'ops-sub' }, `${KIND_WORD[a.kind]} · ${a.actor ?? 'Unknown'} · ${dateTime(a.at)}`)),
                h('span', { class: 'ops-ledger-end ops-sub' }, ago(a.at)),
              ),
            ),
          )
        : h('p', { class: 'ops-sub' }, 'No actions yet.'),
    );
  } catch (err) {
    box.replaceChildren(h('p', { class: 'ops-sub' }, message(err)));
  }
}

void boot('messages:send', () => {
  const confirm = confirmation();
  const refresh = () => void recent();
  messages(confirm, refresh);
  moneyForm(confirm, refresh);
  refundForm(confirm, refresh);
  void recent();
});
