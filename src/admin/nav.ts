import type { RouteKey } from './config';
import type { Permission } from './types/admin';

/**
 * The console's navigation, in the order of the sidebar. Numbered like the
 * site's chapters: in the collapsed rail the numbers are the glyphs. Each
 * entry names the permission its page needs, and an admin only sees the
 * entries their session grants (src/admin/ui/shell.ts).
 */
export interface NavItem {
  key: RouteKey;
  label: string;
  permission: Permission;
}

export const NAV: ReadonlyArray<{ group: string; items: NavItem[] }> = [
  { group: 'Overview', items: [{ key: 'commandCenter', label: 'Command Center', permission: 'console:access' }] },
  {
    group: 'Network',
    items: [
      { key: 'users', label: 'Users', permission: 'users:read' },
      { key: 'connectors', label: 'Connectors', permission: 'connectors:read' },
      { key: 'transactions', label: 'Transactions', permission: 'transactions:read' },
      { key: 'network', label: 'Global Network', permission: 'network:read' },
    ],
  },
  {
    group: 'Money',
    items: [
      { key: 'money', label: 'Money Movement', permission: 'transactions:read' },
      { key: 'assets', label: 'Assets', permission: 'assets:read' },
    ],
  },
  { group: 'Actions', items: [{ key: 'actions', label: 'Actions', permission: 'messages:send' }] },
  {
    group: 'Analytics',
    items: [
      { key: 'analytics', label: 'Analytics', permission: 'analytics:read' },
      { key: 'activity', label: 'Activity', permission: 'activity:read' },
    ],
  },
  {
    group: 'System',
    items: [
      { key: 'health', label: 'System Health', permission: 'system:read' },
      { key: 'security', label: 'Security', permission: 'security:read' },
    ],
  },
  { group: 'Account', items: [{ key: 'account', label: 'Profile & settings', permission: 'console:access' }] },
];

/** Each entry's number, 01–12, in sidebar order. */
export const NAV_NUMBER: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((item, i) => [item.key, String(i + 1).padStart(2, '0')]),
);
