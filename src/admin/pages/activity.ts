/**
 * 09 · Activity: a cursor-paged timeline. The category filter is in the
 * address bar; "Show earlier events" asks the API for the next page.
 */
import { getActivity } from '../services/adminApi';
import type { ActivityCategory } from '../types/admin';
import { need } from '../ui/dom';
import { load, region } from '../ui/region';
import { segmented } from '../ui/segmented';
import { boot, toast } from '../ui/shell';
import { oneOf, param, setParams } from '../ui/url';
import { renderFeed } from './blocks';

const CATEGORIES = ['', 'users', 'transactions', 'connectors', 'security', 'system'] as const;
const LIMIT = 40;

void boot('activity:read', () => {
  const seg = segmented('category');
  let category = oneOf(param('category'), CATEGORIES, '');
  seg.set(category, false);
  const r = region('feed');
  const feed = need('[data-feed]');
  const more = need<HTMLButtonElement>('[data-more]');
  const end = need('[data-end]');
  let cursor: string | null = null;

  const first = () => {
    void load(
      r,
      (signal) => getActivity({ category: (category || undefined) as ActivityCategory | undefined, limit: LIMIT }, { signal }),
      (page) => {
        renderFeed(feed, page.items);
        cursor = page.nextCursor;
        more.hidden = !cursor;
        end.hidden = !!cursor || !page.items.length;
        return page.items.length > 0;
      },
    );
  };

  more.addEventListener('click', async () => {
    if (!cursor) return;
    more.disabled = true;
    more.textContent = 'Loading…';
    try {
      const page = await getActivity({ category: (category || undefined) as ActivityCategory | undefined, cursor, limit: LIMIT });
      renderFeed(feed, page.items, { append: true });
      cursor = page.nextCursor;
      more.hidden = !cursor;
      end.hidden = !!cursor;
    } catch {
      toast('Earlier events could not be loaded. Try again.');
    } finally {
      more.disabled = false;
      more.textContent = 'Show earlier events';
    }
  });

  seg.onChange((v) => {
    category = v as typeof category;
    setParams({ category: category || null });
    first();
  });
  first();
});
