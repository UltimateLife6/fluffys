import { validateCateringInquiry } from '@/lib/catering-inquiry';
import { consumeRateLimit, deliverInquiryNotification, publicEmail, recordAnalytics, recordPublicInquiry } from '@/lib/admin/gateway';
import { bucketKey, clientAddress, originAllowed } from '@/lib/admin/security';

export async function POST(request: Request) {
  if (!originAllowed(request.headers.get('origin'), request.headers.get('x-forwarded-host') || request.headers.get('host'))) {
    return Response.json({ ok: false }, { status: 403 });
  }
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (String(body.company || '').trim()) return Response.json({ ok: false }, { status: 400 });
  const inquiry = {
    name: String(body.name || ''),
    email: String(body.email || ''),
    phone: String(body.phone || ''),
    eventType: String(body.eventType || ''),
    date: String(body.date || ''),
    guests: String(body.guests || ''),
    location: String(body.location || ''),
    details: String(body.details || ''),
    submissionId: String(body.submissionId || ''),
  };
  const errors = validateCateringInquiry(inquiry);
  if (Object.keys(errors).length) return Response.json({ ok: false, errors }, { status: 400 });
  const address = clientAddress(request.headers);
  if (!(await consumeRateLimit(bucketKey('inquiry', address), 5, 60 * 60 * 1000))) {
    return Response.json({ ok: false, error: 'Too many inquiries were submitted from this network. Try again later.' }, { status: 429 });
  }
  const saved = await recordPublicInquiry(inquiry);
  if (!saved.duplicate) {
    await recordAnalytics({
      name: 'catering_inquiry_submit',
      path: '/catering',
      metadata: { category: inquiry.eventType },
      device: /Mobi|Android|iPhone/i.test(request.headers.get('user-agent') || '') ? 'mobile' : 'desktop',
      referrerHost: '',
      eventKey: saved.id,
    });
  }
  const notification = saved.duplicate ? { status: saved.notificationStatus } : await deliverInquiryNotification(saved.id);
  return Response.json({
    ok: true,
    id: saved.id,
    duplicate: saved.duplicate,
    saved: true,
    notification: notification.status,
    email: await publicEmail(),
  });
}
