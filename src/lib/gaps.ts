import { PUBLIC_SHOW_CONTENT_GAPS } from 'astro:env/client';

/**
 * Whether empty fact slots render a visible "content needed" marker.
 * On in `astro dev` and in preview builds with PUBLIC_SHOW_CONTENT_GAPS=true;
 * off in production, where an empty slot renders nothing at all.
 */
export const showGaps: boolean = import.meta.env.DEV || PUBLIC_SHOW_CONTENT_GAPS;
