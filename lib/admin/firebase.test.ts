import assert from 'node:assert/strict';
import { test } from 'node:test';

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

test('firebase emulator admin flow', async (t) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    t.skip('Firebase emulators are not running');
    return;
  }
  process.env.DATA_BACKEND = 'firebase';
  process.env.FIREBASE_PROJECT_ID ||= process.env.GCLOUD_PROJECT || 'fluffys-local';
  process.env.FIREBASE_STORAGE_BUCKET ||= `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||= 'demo-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= process.env.FIREBASE_PROJECT_ID;
  process.env.ADMIN_SESSION_SECRET ||= 'test-session-secret-value';
  delete process.env.EMAIL_PROVIDER;

  const firebase = await import('./firebase-service.ts');
  const { storeImage } = await import('./storage.ts');
  const ownerPassword = 'owner-review-pass';
  const adminPassword = 'noctaris-review-pass';
  await firebase.ensureAuthUser({ id: 'owner-firebase', email: 'owner.firebase@example.com', name: 'Owner', password: ownerPassword, role: 'OWNER' });
  await firebase.ensureAuthUser({ id: 'noctaris-firebase', email: 'noctaris.firebase@example.com', name: 'Noctaris', password: adminPassword, role: 'NOCTARIS_ADMIN' });

  const ownerLogin = await firebase.authenticate('owner.firebase@example.com', ownerPassword);
  const missing = await firebase.authenticate('missing.firebase@example.com', 'not-a-real-password');
  const wrong = await firebase.authenticate('owner.firebase@example.com', 'wrong-password-value');
  assert.equal(ownerLogin.ok, true);
  assert.equal(missing.ok, false);
  assert.equal(wrong.ok, false);
  if (!missing.ok && !wrong.ok) assert.equal(missing.error, wrong.error);
  if (!ownerLogin.ok) return;
  const owner = ownerLogin.actor;
  const session = await firebase.createSession(owner, ownerLogin.idToken);
  assert.equal((await firebase.actorFromToken(session.token))?.role, 'OWNER');
  assert.equal(await firebase.actorFromToken('not-a-session'), null);
  await assert.rejects(() => firebase.listUsers(owner), { name: 'Forbidden' });

  const adminLogin = await firebase.authenticate('noctaris.firebase@example.com', adminPassword);
  assert.equal(adminLogin.ok, true);
  if (!adminLogin.ok) return;
  const users = await firebase.listUsers(adminLogin.actor);
  assert.equal(users.some((user) => user.role === 'OWNER'), true);

  const categoryId = await firebase.saveCategory(owner, { name: 'Firebase Bowls', description: 'Local', image: '/food/korean-bbq.jpg', imageAlt: 'Bowls' });
  const itemId = await firebase.saveMenuItem(owner, { categoryId, name: 'Firebase Draft', note: '<b>', price: '', available: true, featured: false });
  assert.equal((await firebase.publishedMenu())?.some((category) => category.items.some((item) => item.id === itemId)) || false, false);
  await firebase.setMenuItemStatus(owner, itemId, 'published');
  await firebase.setCategoryStatus(owner, categoryId, 'published');
  assert.equal((await firebase.publishedMenu())?.some((category) => category.items.some((item) => item.id === itemId && !String(item.note || '').includes('<'))), true);

  await assert.rejects(() => storeImage({ type: 'image/gif', size: png.byteLength, bytes: png }), /JPEG, PNG, or WebP/);
  const stored = await storeImage({ type: 'image/png', size: png.byteLength, bytes: png });
  assert.equal(stored.provider, 'firebase');
  assert.match(stored.path, /^\/uploads\/[0-9a-f-]+\.png$/);
  await firebase.recordStoredImage(owner, stored);

  const first = await firebase.recordPublicInquiry({
    name: 'Alex <Rivera>',
    email: 'alex.firebase@example.com',
    phone: '',
    eventType: 'Corporate Event',
    date: '2026-12-01',
    guests: '12',
    location: 'Houston',
    details: 'None',
    submissionId: '33333333-3333-4333-8333-333333333333',
  });
  const second = await firebase.recordPublicInquiry({
    name: 'Alex',
    email: 'alex.firebase@example.com',
    phone: '',
    eventType: 'Corporate Event',
    date: '2026-12-01',
    guests: '12',
    location: 'Houston',
    details: 'None',
    submissionId: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.id, first.id);
  const pending = await firebase.deliverInquiryNotification(first.id);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.accepted, false);
  const inquiry = (await firebase.listInquiries(owner))[0] as { status: string; notification_status: string; name: string };
  assert.equal(inquiry.status, 'received');
  assert.equal(inquiry.notification_status, 'pending');
  assert.equal(inquiry.name.includes('<'), false);

  const event = { name: 'order_link_click', path: '/menu', metadata: { provider: 'doordash', email: 'hidden@example.com' }, device: 'desktop', referrerHost: '', eventKey: '44444444-4444-4444-8444-444444444444' };
  assert.equal(await firebase.recordAnalytics(event), true);
  assert.equal(await firebase.recordAnalytics(event), false);
  const report = await firebase.analyticsReport(owner, '2026-10-01', '2026-10-31');
  assert.equal(report.orderClicks >= 1, true);
  assert.equal(JSON.stringify(report).includes('hidden@example.com'), false);

  const { firestore } = await import('./firebase-app.ts');
  const sessions = await firestore().collection('sessions').where('user_id', '==', owner.id).get();
  assert.equal(sessions.empty, false);
  await sessions.docs[0].ref.update({ last_seen_at: '2000-01-01T00:00:00.000Z' });
  assert.equal(await firebase.actorFromToken(session.token), null);

  await firebase.setUserDisabled(adminLogin.actor, owner.id, true);
  const disabledLogin = await firebase.authenticate('owner.firebase@example.com', ownerPassword);
  assert.equal(disabledLogin.ok, false);
  await firebase.setUserDisabled(adminLogin.actor, owner.id, false);

  const project = process.env.FIREBASE_PROJECT_ID;
  const rules = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents/auditLogs`);
  assert.equal(rules.status, 403);
  let allowed = 0;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await firebase.consumeRateLimit('firebase-test-bucket', 3, 60_000)) allowed += 1;
  }
  assert.equal(allowed, 3);

  const logs = (await firebase.listAudit(owner)) as { entity_type: string }[];
  assert.equal(logs.some((log) => log.entity_type === 'user'), false);
  const adminLogs = (await firebase.listAudit(adminLogin.actor)) as { entity_type: string; after_json: string | null }[];
  assert.equal(adminLogs.some((log) => log.entity_type === 'user'), true);
  assert.equal(JSON.stringify(adminLogs).includes(adminPassword), false);
});
