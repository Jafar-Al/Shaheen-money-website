import type { APIContext } from 'astro';
import type { z } from 'astro/zod';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { allow } from './rate-limit';
import { deliver } from './deliver';
import { href, type Locale, type UtilityPageKey } from '../../i18n/config';

/**
 * The one place untrusted input enters the system (threat model B3).
 * Order: size → origin → rate limit → parse → bot checks → Turnstile →
 * strict validation → delivery. Responses are uniform (A8): a bot tripping
 * the honeypot gets the same success a person does, and nothing reveals
 * whether someone has applied before.
 */
const MAX_BODY_BYTES = 16 * 1024;
const MIN_FILL_MS = 2500;

interface Spec {
  kind: 'business' | 'contact';
  schema: z.ZodType<Record<string, unknown>>;
  successPage: UtilityPageKey;
}

export async function handleForm(ctx: APIContext, spec: Spec): Promise<Response> {
  const { request } = ctx;
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  let locale: Locale = 'en';

  const reply = (status: number, body: Record<string, unknown>) => {
    if (wantsJson) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    // Without JavaScript: a 303 to a static result page.
    const target = body.ok ? href(locale, spec.successPage) : href(locale, 'formError');
    return new Response(null, { status: 303, headers: { Location: target, 'Cache-Control': 'no-store' } });
  };

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reply(413, { ok: false });

  // Astro's security.checkOrigin already rejects cross-origin form posts;
  // this also covers fetch() requests carrying Fetch Metadata.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, { ok: false });

  const ip = ctx.clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await allow(spec.kind, ip))) return reply(429, { ok: false });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false });
  }

  const raw: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string') return reply(400, { ok: false }); // no uploads accepted
    raw[key] = value;
  }
  if (raw.locale === 'ar') locale = 'ar';

  const { website, ts, 'cf-turnstile-response': token, ...fields } = raw;

  // Cheap bot filters: honeypot filled, or submitted faster than a person can.
  if (website || (ts && Date.now() - Number(ts) < MIN_FILL_MS)) return reply(200, { ok: true });

  if (TURNSTILE_SECRET_KEY) {
    const verified = await verifyTurnstile(TURNSTILE_SECRET_KEY, token, ip);
    if (!verified) return reply(400, { ok: false });
  }

  const parsed = spec.schema.safeParse(fields);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '');
      if (!field || errors[field]) continue;
      errors[field] = ['required', 'email', 'phone', 'too_long'].includes(issue.message) ? issue.message : 'required';
    }
    // An unknown field means a tampered form: answer as a generic failure.
    if (parsed.error.issues.some((i) => i.code === 'unrecognized_keys')) return reply(400, { ok: false });
    return reply(422, { ok: false, errors });
  }

  const result = await deliver(spec.kind, parsed.data);
  if (result === 'unconfigured') return reply(503, { ok: false });
  if (result === 'failed') return reply(502, { ok: false });
  return reply(200, { ok: true });
}

async function verifyTurnstile(secret: string, token: string | undefined, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
