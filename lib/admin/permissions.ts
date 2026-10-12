export const roles = ['OWNER', 'NOCTARIS_ADMIN'] as const;
export type Role = (typeof roles)[number];

export type Actor = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type AdminAction =
  | 'menu.read'
  | 'menu.write'
  | 'locations.read'
  | 'locations.write'
  | 'catering.read'
  | 'catering.write'
  | 'promotions.read'
  | 'promotions.write'
  | 'content.read'
  | 'content.write'
  | 'analytics.read'
  | 'activity.read'
  | 'users.read'
  | 'users.write'
  | 'settings.read'
  | 'settings.write'
  | 'diagnostics.read';

const ownerActions = new Set<AdminAction>([
  'menu.read',
  'menu.write',
  'locations.read',
  'locations.write',
  'catering.read',
  'catering.write',
  'promotions.read',
  'promotions.write',
  'content.read',
  'content.write',
  'analytics.read',
  'activity.read',
]);

const noctarisActions = new Set<AdminAction>([
  ...ownerActions,
  'users.read',
  'users.write',
  'settings.read',
  'settings.write',
  'diagnostics.read',
]);

export function can(role: Role | undefined, action: AdminAction) {
  if (role === 'NOCTARIS_ADMIN') return noctarisActions.has(action);
  if (role === 'OWNER') return ownerActions.has(action);
  return false;
}

export function assertCan(actor: Actor | null, action: AdminAction) {
  if (!actor) {
    const error = new Error('Sign in to continue.');
    error.name = 'Unauthorized';
    throw error;
  }
  if (!can(actor.role, action)) {
    const error = new Error('You do not have access to that action.');
    error.name = 'Forbidden';
    throw error;
  }
}

const secretKeys = ['password', 'password_hash', 'passwordHash', 'token', 'secret', 'session', 'apiSecret'];

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = secretKeys.some((secret) => key.toLowerCase().includes(secret.toLowerCase())) ? '[redacted]' : redact(entry);
  }
  return output;
}
