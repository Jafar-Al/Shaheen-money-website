import type { AdminSession, Permission, Role } from '../types/admin';

/**
 * The permission model the console is designed around.
 *
 * The server is the authority: it resolves a session's permissions from
 * this table (src/server/admin) and refuses any request without them. The
 * browser only uses permissions to leave out what the API would refuse
 * anyway: hiding a link is a courtesy, never a control.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    'console:access',
    'users:read',
    'users:read_pii',
    'users:export',
    'transactions:read',
    'transactions:export',
    'connectors:read',
    'connectors:export',
    'network:read',
    'assets:read',
    'analytics:read',
    'analytics:export',
    'activity:read',
    'system:read',
    'security:read',
  ],
  OPERATIONS: [
    'console:access',
    'users:read',
    'transactions:read',
    'transactions:export',
    'connectors:read',
    'connectors:export',
    'network:read',
    'assets:read',
    'analytics:read',
    'analytics:export',
    'activity:read',
    'system:read',
  ],
  COMPLIANCE: [
    'console:access',
    'users:read',
    'users:read_pii',
    'users:export',
    'transactions:read',
    'transactions:export',
    'connectors:read',
    'network:read',
    'assets:read',
    'analytics:read',
    'activity:read',
    'security:read',
  ],
  SUPPORT: ['console:access', 'users:read', 'users:read_pii', 'transactions:read', 'connectors:read', 'activity:read', 'system:read'],
  // App users have no access to the console at all.
  USER: [],
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  OPERATIONS: 'Operations',
  COMPLIANCE: 'Compliance',
  SUPPORT: 'Support',
  USER: 'App user',
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  'console:access': 'Open the Operations Command Center',
  'users:read': 'View users',
  'users:read_pii': 'See users’ full email addresses',
  'users:export': 'Export users',
  'transactions:read': 'View transactions',
  'transactions:export': 'Export transactions',
  'connectors:read': 'View Connectors',
  'connectors:export': 'Export Connectors',
  'network:read': 'View the global network',
  'assets:read': 'View assets',
  'analytics:read': 'View analytics',
  'analytics:export': 'Export analytics',
  'activity:read': 'View activity',
  'system:read': 'View system health',
  'security:read': 'View security',
};

export function can(session: AdminSession | null, permission: Permission): boolean {
  return !!session && session.permissions.includes(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
