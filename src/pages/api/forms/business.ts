import type { APIRoute } from 'astro';
import { businessSchema } from '../../../lib/forms/schema';
import { handleForm } from '../../../lib/forms/handler';

/**
 * Business applications, from shops applying to become Connectors and from
 * companies applying to partner. Runs on demand (serverless); every other
 * route on the site is static.
 */
export const prerender = false;

export const POST: APIRoute = (ctx) =>
  handleForm(ctx, { kind: 'business', schema: businessSchema, successPage: 'applicationReceived' });

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
