import type { APIRoute } from 'astro';
import { handle } from '../../../server/admin/router';

/**
 * The operations console's API (src/server/admin/router.ts): sign-in,
 * sessions, and every figure the console shows, each request checked on
 * the server for a session and its permission. Runs on demand
 * (serverless), like the form endpoints.
 */
export const prerender = false;

export const ALL: APIRoute = (ctx) => handle(ctx);
