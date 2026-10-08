import { createHmac } from 'node:crypto';
import {
  FORMS_EMAIL_FROM,
  FORMS_EMAIL_TO,
  FORMS_WEBHOOK_SECRET,
  FORMS_WEBHOOK_URL,
  RESEND_API_KEY,
} from 'astro:env/server';

/**
 * Where a valid submission goes. Two optional sinks, either or both:
 *   · a webhook (CRM, ticketing, Slack/Make/Zapier), signed with HMAC-SHA256
 *     over "<timestamp>.<body>" so the receiver can verify it came from us;
 *   · an email via Resend to one fixed internal address. The recipient never
 *     comes from the form, so the form cannot be used as a mail relay (A2).
 * Submissions are never logged (audit L.5 #13); only the outcome is.
 */
export type DeliveryResult = 'ok' | 'failed' | 'unconfigured';

export async function deliver(kind: 'business' | 'contact', data: Record<string, unknown>): Promise<DeliveryResult> {
  const submittedAt = new Date().toISOString();
  const attempts: Array<Promise<boolean>> = [];

  if (FORMS_WEBHOOK_URL) {
    const body = JSON.stringify({ kind, submittedAt, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Shaheen-Timestamp': timestamp };
    if (FORMS_WEBHOOK_SECRET) {
      headers['X-Shaheen-Signature'] = `sha256=${createHmac('sha256', FORMS_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex')}`;
    }
    attempts.push(
      fetch(FORMS_WEBHOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) })
        .then((r) => r.ok)
        .catch(() => false),
    );
  }

  if (RESEND_API_KEY && FORMS_EMAIL_TO && FORMS_EMAIL_FROM) {
    const subject =
      kind === 'business'
        ? `New business application (${String(data.type ?? 'unspecified')})`
        : `Contact form: ${String(data.topic ?? 'message')}`;
    const text = Object.entries(data)
      .map(([k, v]) => `${k}: ${String(v ?? '')}`)
      .join('\n');
    const replyTo = typeof data.email === 'string' && data.email ? data.email : undefined;
    attempts.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FORMS_EMAIL_FROM,
          to: [FORMS_EMAIL_TO],
          subject: `[shaheen.money] ${subject}`,
          text: `${text}\n\nsubmitted: ${submittedAt}`,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => r.ok)
        .catch(() => false),
    );
  }

  if (attempts.length === 0) {
    if (import.meta.env.DEV) {
      console.info(`[forms] ${kind} accepted in dev (no sink configured); fields: ${Object.keys(data).join(', ')}`);
      return 'ok';
    }
    console.error(`[forms] ${kind} rejected: no delivery sink configured`);
    return 'unconfigured';
  }

  const results = await Promise.all(attempts);
  const ok = results.some(Boolean);
  if (!ok) console.error(`[forms] ${kind} delivery failed on every sink`);
  return ok ? 'ok' : 'failed';
}
