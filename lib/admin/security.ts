import { createHash } from 'node:crypto';

const absoluteTimeoutMs = 12 * 60 * 60 * 1000;
const idleTimeoutMs = 4 * 60 * 60 * 1000;

export const sessionPolicy = {
  absoluteHours: 12,
  idleHours: 4,
  absoluteTimeoutMs,
  idleTimeoutMs,
  note: 'Twelve hours covers a service day. A session also ends after four idle hours, and the server checks both limits.',
};

export function originAllowed(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientAddress(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || 'local';
}

export function bucketKey(prefix: string, value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || 'local';
  return `${prefix}:${createHash('sha256').update(`${secret}:${value}`).digest('hex')}`;
}

const blockedProtocols = ['javascript:', 'data:', 'vbscript:'];

export function safeUrl(value: string, kind: 'web' | 'phone' | 'any' = 'web') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (blockedProtocols.some((protocol) => lower.startsWith(protocol))) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const url = new URL(trimmed);
    const allowed =
      kind === 'phone'
        ? ['tel:', 'https:', 'http:']
        : kind === 'any'
          ? ['https:', 'http:', 'mailto:', 'tel:']
          : ['https:', 'http:'];
    if (!allowed.includes(url.protocol)) return '';
    return trimmed;
  } catch {
    return '';
  }
}

export function containsMarkup(value: string) {
  return /[<>]/.test(value);
}

export function plainText(value: string, max = 2000) {
  return value.replace(/[<>]/g, '').trim().slice(0, max);
}
