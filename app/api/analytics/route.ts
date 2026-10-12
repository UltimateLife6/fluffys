import { measurementId, recordAnalytics } from '@/lib/admin/gateway';
import { originAllowed } from '@/lib/admin/security';

const eventNames = new Set([
  'menu_view',
  'menu_item_view',
  'order_link_click',
  'phone_click',
  'catering_inquiry_submit',
  'truck_location_click',
  'promotion_click',
]);

const allowedMeta = new Set(['itemId', 'category', 'provider', 'promotionId', 'stopId']);

function deviceFrom(userAgent: string) {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(userAgent)) return 'mobile';
  if (!userAgent) return 'unknown';
  return 'desktop';
}

function consentGranted(request: Request) {
  return (request.headers.get('cookie') || '').split(';').some((part) => part.trim() === 'fluffys_analytics=granted');
}

export async function POST(request: Request) {
  if (!originAllowed(request.headers.get('origin'), request.headers.get('x-forwarded-host') || request.headers.get('host'))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const text = await request.text();
  if (text.length > 2000) return Response.json({ ok: false }, { status: 413 });
  let body: { name?: string; path?: string; metadata?: Record<string, unknown>; eventId?: string; clientId?: string };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!body.name || !eventNames.has(body.name)) return Response.json({ ok: false }, { status: 400 });
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.metadata || {})) {
    if (allowedMeta.has(key) && typeof value === 'string' && !value.includes('@')) metadata[key] = value.slice(0, 80);
  }
  let referrerHost = '';
  try {
    referrerHost = new URL(request.headers.get('referer') || '').host;
  } catch {
    referrerHost = '';
  }
  const eventKey = typeof body.eventId === 'string' && /^[0-9a-f-]{36}$/i.test(body.eventId) ? body.eventId : '';
  try {
    const stored = await recordAnalytics({
      name: body.name,
      path: String(body.path || '').slice(0, 200),
      metadata,
      device: deviceFrom(request.headers.get('user-agent') || ''),
      referrerHost,
      eventKey: eventKey || undefined,
    });
    const configuredId = await measurementId();
    const secret = process.env.GA4_API_SECRET;
    let ga: 'skipped' | 'sent' | 'failed' = 'skipped';
    const clientId = typeof body.clientId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.clientId) ? body.clientId : '';
    if (stored && configuredId && secret && consentGranted(request) && clientId) {
      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(configuredId)}&api_secret=${encodeURIComponent(secret)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            events: [{ name: body.name, params: { page_path: body.path || '/', ...metadata } }],
          }),
          signal: AbortSignal.timeout(8000),
        },
      ).catch(() => undefined);
      ga = response?.ok ? 'sent' : 'failed';
    }
    return Response.json({ ok: true, stored, ga });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
