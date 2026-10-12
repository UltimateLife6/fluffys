import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { hasImageSignature, validateImageUpload } from './images.ts';
import { assertCan, can, redact } from './permissions.ts';

const root = mkdtempSync(path.join(tmpdir(), 'fluffys-admin-'));
process.env.ADMIN_DB_PATH = path.join(root, 'admin.sqlite');
process.env.ADMIN_SESSION_SECRET = 'test-session-secret-value';

const owner = { id: 'owner-1', email: 'owner@test.local', name: 'Owner', role: 'OWNER' as const };
const noctaris = { id: 'noctaris-1', email: 'noctaris@test.local', name: 'Noctaris', role: 'NOCTARIS_ADMIN' as const };

after(async () => {
  const { closeDatabase } = await import('./db.ts');
  closeDatabase();
  rmSync(root, { recursive: true, force: true });
});

test('roles deny by default and owners cannot manage accounts', () => {
  assert.equal(can(undefined, 'menu.read'), false);
  assert.equal(can('OWNER', 'menu.write'), true);
  assert.equal(can('OWNER', 'users.write'), false);
  assert.equal(can('OWNER', 'settings.write'), false);
  assert.equal(can('NOCTARIS_ADMIN', 'users.write'), true);
  assert.equal(can('NOCTARIS_ADMIN', 'diagnostics.read'), true);
  assert.throws(() => assertCan(null, 'menu.read'), { name: 'Unauthorized' });
  assert.throws(() => assertCan(owner, 'users.write'), { name: 'Forbidden' });
});

test('image uploads accept jpeg, png, and webp within 2 MB', () => {
  assert.equal(validateImageUpload({ type: 'image/gif', size: 100 }), 'Use a JPEG, PNG, or WebP image.');
  assert.equal(validateImageUpload({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }), 'Images must be 2 MB or smaller.');
  assert.equal(validateImageUpload({ type: 'image/jpeg', size: 1200 }), null);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const fake = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(hasImageSignature(png, 'image/png'), true);
  assert.equal(hasImageSignature(fake, 'image/png'), false);
});

test('redact removes secrets from audit snapshots', () => {
  assert.deepEqual(redact({ name: 'Bowl', password: 'secret', nested: { apiSecret: 'abc' } }), {
    name: 'Bowl',
    password: '[redacted]',
    nested: { apiSecret: '[redacted]' },
  });
});

test('menu, stops, inquiries, analytics, and audit rules', async () => {
  const { closeDatabase } = await import('./db.ts');
  const service = await import('./service.ts');
  const { categories } = await import('../data.ts');
  const { getPublicMenu } = await import('../public-content.ts');
  const { POST } = await import('../../app/api/analytics/route.ts');
  const { POST: postInquiry } = await import('../../app/api/inquiries/route.ts');

  assert.equal((await getPublicMenu())[0].name, categories[0].name);

  service.seedCatalog();
  const seeded = service.publishedMenu();
  assert.ok(seeded);
  assert.deepEqual(
    seeded.map((category) => category.name),
    categories.map((category) => category.name),
  );
  assert.equal(seeded.some((category) => category.items.some((item) => item.priceCents != null)), false);

  const categoryId = seeded[0].id;
  const itemId = service.saveMenuItem(owner, {
    categoryId,
    name: 'Draft Special',
    note: 'Not public yet',
    price: '',
    available: true,
    featured: false,
  });
  assert.equal(
    service.publishedMenu()?.some((category) => category.items.some((item) => item.name === 'Draft Special')),
    false,
  );
  service.setMenuItemStatus(owner, itemId, 'published');
  service.saveMenuItem(owner, {
    id: itemId,
    categoryId,
    name: 'Draft Special',
    note: 'Now listed',
    price: '12.50',
    available: false,
    featured: true,
  });
  const published = service.publishedMenu()?.flatMap((category) => category.items).find((item) => item.id === itemId);
  assert.equal(published?.priceCents, 1250);
  assert.equal(published?.available, false);
  assert.equal(published?.featured, true);
  assert.throws(() => service.saveMenuItem(owner, { id: itemId, categoryId, name: 'Draft Special', note: '', price: '12.5.0', available: true, featured: false }));
  service.setMenuItemStatus(owner, itemId, 'archived');
  assert.equal(
    service.publishedMenu()?.some((category) => category.items.some((item) => item.id === itemId)),
    false,
  );
  service.setMenuItemStatus(owner, itemId, 'published');

  const hidden = service.saveStop(owner, {
    name: 'Hidden stop',
    address: '123 Test St',
    startsAt: '2026-10-10T10:00',
    endsAt: '2026-10-10T18:00',
    hours: '10–6',
    visible: false,
    status: 'published',
  });
  assert.equal(service.publishedStops('2026-10-10T12:00').some((stop) => stop.id === hidden), false);
  const visible = service.saveStop(owner, {
    name: 'Market stop',
    address: '456 Test Ave',
    startsAt: '2026-10-10T10:00',
    endsAt: '2026-10-10T18:00',
    hours: '10–6',
    visible: true,
    status: 'published',
  });
  assert.equal(service.publishedStops('2026-10-10T12:00').some((stop) => stop.id === visible), true);
  assert.equal(service.publishedStops('2026-10-11T12:00').some((stop) => stop.id === visible), false);
  service.saveStop(owner, {
    id: visible,
    name: 'Market stop',
    address: '456 Test Ave',
    startsAt: '2026-10-10T10:00',
    endsAt: '2026-10-10T18:00',
    hours: '10–6',
    visible: true,
    status: 'draft',
  });
  assert.equal(service.publishedStops('2026-10-10T12:00').some((stop) => stop.id === visible), false);

  const inquiryResponse = await postInquiry(
    new Request('http://localhost/api/inquiries', {
      method: 'POST',
      headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Rivera',
        email: 'alex@example.com',
        phone: '',
        eventType: 'Corporate Event',
        date: '2026-11-02',
        guests: '20',
        location: 'Houston',
        details: '',
      }),
    }),
  );
  assert.equal(inquiryResponse.status, 200);
  const stored = service.listInquiries(owner) as { id: string; status: string }[];
  assert.equal(stored[0].status, 'received');
  service.updateInquiry(owner, stored[0].id, 'contacted', 'Called the host.');
  service.updateInquiry(owner, stored[0].id, 'quoted', 'Sent a quote.');
  service.updateInquiry(owner, stored[0].id, 'booked', 'Date held.');
  assert.equal((service.listInquiries(owner) as { status: string }[])[0].status, 'booked');
  const rejected = await postInquiry(
    new Request('http://localhost/api/inquiries', {
      method: 'POST',
      headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    }),
  );
  assert.equal(rejected.status, 400);

  const tracked = await POST(
    new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { origin: 'http://localhost', host: 'localhost', 'user-agent': 'Mozilla/5.0 (iPhone)' },
      body: JSON.stringify({ name: 'menu_view', path: '/menu', metadata: { category: 'Seafood', email: 'nope' } }),
    }),
  );
  assert.equal(tracked.status, 200);
  const blocked = await POST(
    new Request('http://localhost/api/analytics', {
      method: 'POST',
      headers: { origin: 'http://localhost', host: 'localhost' },
      body: JSON.stringify({ name: 'password_view' }),
    }),
  );
  assert.equal(blocked.status, 400);
  const today = new Date();
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const report = service.analyticsReport(owner, day, day);
  assert.equal(report.menuViews, 1);
  assert.equal(report.pageViews, 0);
  assert.ok(report.daily.some((entry) => entry.label === day && entry.total >= 1));
  assert.equal(report.devices.some((entry) => entry.label === 'mobile'), true);

  assert.throws(() => service.inviteOwner(owner, { name: 'New', email: 'new@test.local', password: 'long-password', role: 'NOCTARIS_ADMIN' }), { name: 'Forbidden' });
  const ownerLogs = service.listAudit(owner) as { entity_type: string; action: string }[];
  assert.equal(ownerLogs.some((log) => log.action === 'menu_item.create'), true);
  assert.equal(ownerLogs.some((log) => log.entity_type === 'user'), false);
  service.inviteOwner(noctaris, { name: 'Second Owner', email: 'second@test.local', password: 'long-password', role: 'OWNER' });
  const adminLogs = service.listAudit(noctaris) as { entity_type: string; after_json: string | null }[];
  const invite = adminLogs.find((log) => log.entity_type === 'user');
  assert.ok(invite);
  assert.equal(String(invite.after_json).includes('password'), false);

  const session = service.createSession(owner);
  const database = (await import('./db.ts')).openDatabase();
  database.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash != ?').run('2000-01-01T00:00:00.000Z', 'none');
  assert.equal(service.actorFromToken(session.token), null);

  closeDatabase();
});
