import type { APIRoute } from 'astro';
import { contactSchema } from '../../../lib/forms/schema';
import { handleForm } from '../../../lib/forms/handler';

/** Contact form. Runs on demand (serverless); everything else is static. */
export const prerender = false;

export const POST: APIRoute = (ctx) => handleForm(ctx, { kind: 'contact', schema: contactSchema, successPage: 'messageSent' });

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
