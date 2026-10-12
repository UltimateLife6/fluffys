import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assertUploadPath } from './storage.ts';
import { originAllowed, safeUrl } from './security.ts';
import { selectedCategory } from '../menu-selection.ts';

const root = mkdtempSync(path.join(tmpdir(), 'fluffys-phase2-'));
process.env.ADMIN_DB_PATH = path.join(root, 'admin.sqlite');
process.env.ADMIN_SESSION_SECRET = 'test-session-secret-value';
delete process.env.DATABASE_URL;
delete process.env.EMAIL_PROVIDER;

const owner = { id: 'owner-1', email: 'owner@test.local', name: 'Owner', role: 'OWNER' as const };

test('urls and origin checks', () => {
  assert.equal(originAllowed('http://127.0.0.1:3001', '127.0.0.1:3001'), true);
  assert.equal(originAllowed('https://evil.example', '127.0.0.1:3001'), false);
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('/menu?category=Seafood'), '/menu?category=Seafood');
  assert.equal(safeUrl('https://www.instagram.com/fluffysbistro/'), 'https://www.instagram.com/fluffysbistro/');
  assert.throws(() => assertUploadPath('../secret.png'));
  assert.equal(selectedCategory(['Po’Boys', 'Seafood'], 'Po’Boys'), 'Po’Boys');
  assert.equal(selectedCategory(['Seafood'], 'Missing'), 'All');
});

test('migrations, inquiry delivery, dedupe, and idle sessions', async () => {
  const { applySqliteMigrations, assertLocalMigrationTarget } = await import('./migrate.ts');
  const { openDatabase, closeDatabase } = await import('./db.ts');
  const service = await import('./service.ts');
  process.env.DATABASE_URL = 'postgres://user:secret@example.neon.tech/fluffys';
  assert.throws(() => assertLocalMigrationTarget(), /DATABASE_URL/);
  delete process.env.DATABASE_URL;

  const database = openDatabase();
  const versions = applySqliteMigrations(database);
  assert.deepEqual(versions.map((row) => row.version), [1, 2]);
  service.seedCatalog();
  const categoryId = service.publishedMenu()?.[0].id || '';
  const itemId = service.saveMenuItem(owner, {
    categoryId,
    name: 'Phase Two Special',
    note: '<script>',
    price: '9.00',
    available: true,
    featured: false,
  });
  service.setMenuItemStatus(owner, itemId, 'published');
  assert.equal(service.publishedMenu()?.some((category) => category.items.some((item) => item.id === itemId)), true);

  process.env.EMAIL_PROVIDER = 'mock';
  process.env.EMAIL_MOCK_MODE = 'failed';
  const first = service.recordPublicInquiry({
    name: 'Alex <Rivera>',
    email: 'alex@example.com',
    phone: '',
    eventType: 'Corporate Event',
    date: '2026-12-01',
    guests: '12',
    location: 'Houston',
    details: 'None',
    submissionId: '11111111-1111-4111-8111-111111111111',
  });
  const second = service.recordPublicInquiry({
    name: 'Alex',
    email: 'alex@example.com',
    phone: '',
    eventType: 'Corporate Event',
    date: '2026-12-01',
    guests: '12',
    location: 'Houston',
    details: 'None',
    submissionId: '11111111-1111-4111-8111-111111111111',
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.id, first.id);
  const failed = await service.deliverInquiryNotification(first.id);
  assert.equal(failed.accepted, false);
  assert.equal(failed.status, 'failed');
  const row = service.listInquiries(owner)[0] as { status: string; notification_status: string; name: string };
  assert.equal(row.status, 'received');
  assert.equal(row.notification_status, 'failed');
  assert.equal(row.name.includes('<'), false);
  delete process.env.EMAIL_PROVIDER;

  const event = { name: 'order_link_click', path: '/menu', metadata: { provider: 'doordash', email: 'hidden@example.com' }, device: 'desktop', referrerHost: '', eventKey: '22222222-2222-4222-8222-222222222222' };
  assert.equal(service.recordAnalytics(event), true);
  assert.equal(service.recordAnalytics(event), false);

  const session = service.createSession(owner);
  database.prepare('UPDATE sessions SET last_seen_at = ?').run('2000-01-01T00:00:00.000Z');
  assert.equal(service.actorFromToken(session.token), null);
  closeDatabase();
  rmSync(root, { recursive: true, force: true });
});
