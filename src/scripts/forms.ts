/**
 * Progressive enhancement for [data-enhanced-form]. The server validates
 * everything again; this layer only gives faster, clearer, localised
 * feedback. Messages come from data-msg-* attributes on the form.
 */
const PHONE = /^\+?[0-9][0-9\s\-().]{6,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-enhanced-form]')) {
  form.noValidate = true;
  const msg = (key: string) => form.dataset[key] ?? '';
  const ts = form.querySelector<HTMLInputElement>('[data-ts]');
  if (ts) ts.value = String(Date.now());

  const summary = form.querySelector<HTMLElement>('[data-form-summary]')!;
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const idleLabel = submitLabel.textContent ?? '';

  const controls = () =>
    [...form.querySelectorAll<Control>('input:not([type=hidden]):not([name=website]), select, textarea')].filter((c) => c.name);

  const setError = (control: Control, text: string | null) => {
    const field = control.closest<HTMLElement>('[data-field]');
    const error = field?.querySelector<HTMLElement>('[data-error]');
    const hint = field?.querySelector<HTMLElement>('[data-hint]');
    if (!error) return;
    if (text) {
      control.setAttribute('aria-invalid', 'true');
      error.querySelector('[data-error-text]')!.textContent = text;
      error.hidden = false;
      if (hint) hint.hidden = true;
    } else {
      control.removeAttribute('aria-invalid');
      error.hidden = true;
      if (hint) hint.hidden = false;
    }
  };

  const check = (control: Control): string | null => {
    const value = control instanceof HTMLInputElement && control.type === 'checkbox' ? (control.checked ? 'yes' : '') : control.value.trim();
    if (control.required && !value) {
      return control.name === 'consent' ? msg('msgConsent') : msg('msgRequired');
    }
    if (!value) return null;
    if (control instanceof HTMLInputElement && control.type === 'email' && !EMAIL.test(value)) return msg('msgEmail');
    if (control instanceof HTMLInputElement && control.type === 'tel' && !PHONE.test(value)) return msg('msgPhone');
    const max = Number(control.getAttribute('maxlength'));
    if (max && value.length > max) return msg('msgTooLong');
    return null;
  };

  // Re-check a field once the visitor has interacted with it.
  for (const control of controls()) {
    control.addEventListener('change', () => {
      if (control.getAttribute('aria-invalid') === 'true') setError(control, check(control));
    });
    control.addEventListener('blur', () => {
      if (control.getAttribute('aria-invalid') === 'true') setError(control, check(control));
    });
  }

  const busy = (on: boolean) => {
    submit.disabled = on;
    submit.setAttribute('aria-busy', String(on));
    submitLabel.textContent = on ? msg('msgSending') : idleLabel;
    status.textContent = on ? msg('msgSending') : '';
  };

  const fail = (text: string) => {
    summary.textContent = text;
    summary.hidden = false;
    summary.focus();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    summary.hidden = true;

    let first: Control | null = null;
    for (const control of controls()) {
      const problem = check(control);
      setError(control, problem);
      if (problem && !first) first = control;
    }
    if (first) {
      fail(msg('msgSummary'));
      first.focus();
      return;
    }

    busy(true);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; errors?: Record<string, string> };

      if (response.ok && result.ok) {
        const success = document.getElementById(form.dataset.success ?? '');
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.querySelector<HTMLElement>('h2, h3')?.focus();
        }
        return;
      }
      if (response.status === 422 && result.errors) {
        let firstInvalid: Control | null = null;
        for (const [name, code] of Object.entries(result.errors)) {
          const control = form.querySelector<Control>(`[name="${CSS.escape(name)}"]`);
          if (!control) continue;
          const text = code === 'email' ? msg('msgEmail') : code === 'phone' ? msg('msgPhone') : code === 'too_long' ? msg('msgTooLong') : name === 'consent' ? msg('msgConsent') : msg('msgRequired');
          setError(control, text);
          firstInvalid ??= control;
        }
        fail(msg('msgSummary'));
        firstInvalid?.focus();
      } else if (response.status === 429) {
        fail(msg('msgRateLimited'));
      } else if (response.status === 503) {
        fail(msg('msgUnavailable'));
      } else {
        fail(msg('msgServer'));
      }
    } catch {
      fail(msg('msgNetwork'));
    } finally {
      busy(false);
    }
  });
}
