import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { categories as staticCategories, contact } from '@/lib/data';
import { databaseExists, openDatabase } from '@/lib/admin/db';
import { sendRestaurantEmail, mailProvider } from '@/lib/admin/mail';
import { applySqliteMigrations } from '@/lib/admin/migrate';
import { assertCan, redact, type Actor, type AdminAction, type Role } from '@/lib/admin/permissions';
import { readinessReport } from '@/lib/admin/readiness';
import { plainText, safeUrl, sessionPolicy } from '@/lib/admin/security';
import { cleanSiteContent, defaultSiteContent, type SiteContent } from '@/lib/admin/site-defaults';

export type { SiteContent } from '@/lib/admin/site-defaults';
export { defaultSiteContent } from '@/lib/admin/site-defaults';

export type ContentStatus = 'draft' | 'published' | 'archived';

const inquiryStatuses = ['email_prepared', 'received', 'reviewing', 'contacted', 'closed'] as const;
const dummyPasswordHash = `${'ab'.repeat(16)}:${'cd'.repeat(64)}`;
let migrationsReady = false;
export type InquiryStatus = (typeof inquiryStatuses)[number];

function now() {
  return new Date().toISOString();
}

function db() {
  const database = openDatabase();
  if (!migrationsReady && process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
    applySqliteMigrations(database);
    migrationsReady = true;
  }
  return database;
}

function withTransaction<T>(run: () => T) {
  const database = db();
  database.exec('BEGIN');
  try {
    const value = run();
    database.exec('COMMIT');
    return value;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function hashToken(token: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

function rowActor(row: Record<string, unknown> | undefined): Actor | null {
  if (!row || row.disabled) return null;
  return { id: String(row.id), email: String(row.email), name: String(row.name), role: row.role as Role };
}

export function writeAudit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  db()
    .prepare(
      `INSERT INTO audit_logs (id, user_id, role, action, entity_type, entity_id, before_json, after_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      actor.id,
      actor.role,
      action,
      entityType,
      entityId,
      before == null ? null : JSON.stringify(redact(before)),
      after == null ? null : JSON.stringify(redact(after)),
      now(),
    );
}

function requireAction(actor: Actor | null, action: AdminAction) {
  assertCan(actor, action);
  return actor as Actor;
}

export function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const database = db();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const attempts = database.prepare('SELECT COUNT(*) AS count FROM login_attempts WHERE email = ? AND created_at > ?').get(normalized, since) as {
    count: number;
  };
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get(normalized) as Record<string, unknown> | undefined;
  const actor = rowActor(user);
  const passwordMatches = verifyPassword(password, user ? String(user.password_hash) : dummyPasswordHash);
  if (attempts.count >= 5) return { ok: false as const, error: 'Too many attempts. Try again in a few minutes.' };
  if (!user || !actor || !passwordMatches) {
    database.prepare('INSERT INTO login_attempts (email, created_at) VALUES (?, ?)').run(normalized, now());
    return { ok: false as const, error: 'Email or password is incorrect.' };
  }
  return { ok: true as const, actor, idToken: '' };
}

export function createSession(actor: Actor, _idToken = '') {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  db()
    .prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), actor.id, hashToken(token), expires, now(), now());
  return { token, expires };
}

export function actorFromToken(token: string | undefined) {
  if (!token) return null;
  const session = db().prepare('SELECT * FROM sessions WHERE token_hash = ?').get(hashToken(token)) as
    | { id: string; user_id: string; expires_at: string; created_at: string; last_seen_at: string | null }
    | undefined;
  if (!session) return null;
  if (String(session.expires_at) < now()) return null;
  const seen = session.last_seen_at ? String(session.last_seen_at) : String(session.created_at);
  if (Date.now() - Date.parse(seen) > sessionPolicy.idleTimeoutMs) {
    db().prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return null;
  }
  if (!session.last_seen_at || Date.now() - Date.parse(seen) > 5 * 60 * 1000) {
    db().prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now(), session.id);
  }
  const user = db().prepare('SELECT * FROM users WHERE id = ?').get(String(session.user_id)) as Record<string, unknown> | undefined;
  return rowActor(user);
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  db().prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export function seedCatalog(database: DatabaseSync = db()) {
  const existing = database.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (existing.count > 0) return;
  const insertCategory = database.prepare(
    `INSERT INTO categories (id, name, description, image, image_alt, image_position, sort_order, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
  );
  const insertItem = database.prepare(
    `INSERT INTO menu_items (id, category_id, name, note, price_cents, available, featured, image, sort_order, status, updated_at)
     VALUES (?, ?, ?, ?, NULL, 1, 0, NULL, ?, 'published', ?)`,
  );
  const stamp = now();
  staticCategories.forEach((category, categoryIndex) => {
    const categoryId = slug(category.name) || randomUUID();
    insertCategory.run(categoryId, category.name, category.description, category.image, category.imageAlt, category.imagePosition ?? null, categoryIndex, stamp);
    category.items.forEach((item, itemIndex) => {
      insertItem.run(`${categoryId}-${slug(item.name) || itemIndex}`, categoryId, item.name, item.note ?? '', itemIndex, stamp);
    });
  });
  const content = JSON.stringify(defaultSiteContent);
  database
    .prepare('INSERT INTO site_documents (id, draft_json, published_json, updated_at) VALUES (?, ?, ?, ?)')
    .run('website', content, content, stamp);
}

export function seedUser(input: { email: string; name: string; password: string; role: Role }) {
  const email = input.email.trim().toLowerCase();
  const existing = db().prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  db()
    .prepare('INSERT INTO users (id, email, name, role, password_hash, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .run(id, email, input.name, input.role, hashPassword(input.password), now());
  return id;
}

function money(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error('Enter a price like 12 or 12.50, or leave it blank.');
  return Math.round(Number(trimmed) * 100);
}

export function listCategories(actor: Actor | null, includeArchived = true) {
  requireAction(actor, 'menu.read');
  const categories = db()
    .prepare(`SELECT * FROM categories ${includeArchived ? '' : "WHERE status != 'archived'"} ORDER BY sort_order, name`)
    .all() as Record<string, unknown>[];
  const items = db().prepare('SELECT * FROM menu_items ORDER BY sort_order, name').all() as Record<string, unknown>[];
  return categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.category_id === category.id),
  }));
}

export function saveCategory(actor: Actor | null, input: { id?: string; name: string; description: string; image: string; imageAlt: string; imagePosition?: string }) {
  const user = requireAction(actor, 'menu.write');
  const name = input.name.trim();
  if (!name) throw new Error('Enter a category name.');
  const stamp = now();
  if (input.id) {
    const before = db().prepare('SELECT * FROM categories WHERE id = ?').get(input.id);
    if (!before) throw new Error('Category not found.');
    db()
      .prepare('UPDATE categories SET name = ?, description = ?, image = ?, image_alt = ?, image_position = ?, updated_at = ? WHERE id = ?')
      .run(name, input.description.trim(), input.image.trim(), input.imageAlt.trim(), input.imagePosition?.trim() || null, stamp, input.id);
    const after = db().prepare('SELECT * FROM categories WHERE id = ?').get(input.id);
    writeAudit(user, 'category.update', 'category', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  const order = db().prepare('SELECT COALESCE(MAX(sort_order), -1) AS value FROM categories').get() as { value: number };
  db()
    .prepare(
      `INSERT INTO categories (id, name, description, image, image_alt, image_position, sort_order, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    )
    .run(id, name, input.description.trim(), input.image.trim() || '/food/sides.jpg', input.imageAlt.trim() || name, input.imagePosition?.trim() || null, order.value + 1, stamp);
  writeAudit(user, 'category.create', 'category', id, null, { name });
  return id;
}

export function setCategoryStatus(actor: Actor | null, id: string, status: ContentStatus) {
  const user = requireAction(actor, 'menu.write');
  const before = db().prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!before) throw new Error('Category not found.');
  db().prepare('UPDATE categories SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
  writeAudit(user, `category.${status}`, 'category', id, before, db().prepare('SELECT * FROM categories WHERE id = ?').get(id));
}

export function moveCategory(actor: Actor | null, id: string, direction: -1 | 1) {
  const user = requireAction(actor, 'menu.write');
  const rows = db().prepare('SELECT id, sort_order FROM categories ORDER BY sort_order, name').all() as { id: string; sort_order: number }[];
  const index = rows.findIndex((row) => row.id === id);
  const swap = rows[index + direction];
  if (index < 0 || !swap) return;
  const current = rows[index];
  db().prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(swap.sort_order, current.id);
  db().prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(current.sort_order, swap.id);
  writeAudit(user, 'category.reorder', 'category', id, { sort_order: current.sort_order }, { sort_order: swap.sort_order });
}

export function saveMenuItem(
  actor: Actor | null,
  input: {
    id?: string;
    categoryId: string;
    name: string;
    note: string;
    price: string;
    available: boolean;
    featured: boolean;
    image?: string | null;
  },
) {
  const user = requireAction(actor, 'menu.write');
  const name = input.name.trim();
  if (!name) throw new Error('Enter an item name.');
  const category = db().prepare('SELECT id FROM categories WHERE id = ?').get(input.categoryId);
  if (!category) throw new Error('Choose a category.');
  const price = money(input.price);
  const stamp = now();
  if (input.id) {
    const before = db().prepare('SELECT * FROM menu_items WHERE id = ?').get(input.id);
    if (!before) throw new Error('Menu item not found.');
    db()
      .prepare(
        `UPDATE menu_items SET category_id = ?, name = ?, note = ?, price_cents = ?, available = ?, featured = ?, image = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.categoryId, name, input.note.trim(), price, input.available ? 1 : 0, input.featured ? 1 : 0, input.image || null, stamp, input.id);
    writeAudit(user, 'menu_item.update', 'menu_item', input.id, before, db().prepare('SELECT * FROM menu_items WHERE id = ?').get(input.id));
    return input.id;
  }
  const id = randomUUID();
  const order = db().prepare('SELECT COALESCE(MAX(sort_order), -1) AS value FROM menu_items WHERE category_id = ?').get(input.categoryId) as {
    value: number;
  };
  db()
    .prepare(
      `INSERT INTO menu_items (id, category_id, name, note, price_cents, available, featured, image, sort_order, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    )
    .run(id, input.categoryId, name, input.note.trim(), price, input.available ? 1 : 0, input.featured ? 1 : 0, input.image || null, order.value + 1, stamp);
  writeAudit(user, 'menu_item.create', 'menu_item', id, null, { name, price_cents: price, available: input.available });
  return id;
}

export function setMenuItemStatus(actor: Actor | null, id: string, status: ContentStatus) {
  const user = requireAction(actor, 'menu.write');
  const before = db().prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  if (!before) throw new Error('Menu item not found.');
  db().prepare('UPDATE menu_items SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
  writeAudit(user, `menu_item.${status}`, 'menu_item', id, before, db().prepare('SELECT * FROM menu_items WHERE id = ?').get(id));
}

export function moveMenuItem(actor: Actor | null, id: string, direction: -1 | 1) {
  const user = requireAction(actor, 'menu.write');
  const item = db().prepare('SELECT id, category_id, sort_order FROM menu_items WHERE id = ?').get(id) as
    | { id: string; category_id: string; sort_order: number }
    | undefined;
  if (!item) return;
  const rows = db()
    .prepare('SELECT id, sort_order FROM menu_items WHERE category_id = ? ORDER BY sort_order, name')
    .all(item.category_id) as { id: string; sort_order: number }[];
  const index = rows.findIndex((row) => row.id === id);
  const swap = rows[index + direction];
  if (!swap) return;
  db().prepare('UPDATE menu_items SET sort_order = ? WHERE id = ?').run(swap.sort_order, item.id);
  db().prepare('UPDATE menu_items SET sort_order = ? WHERE id = ?').run(item.sort_order, swap.id);
  writeAudit(user, 'menu_item.reorder', 'menu_item', id, { sort_order: item.sort_order }, { sort_order: swap.sort_order });
}

export function listStops(actor: Actor | null) {
  requireAction(actor, 'locations.read');
  return db().prepare('SELECT * FROM truck_stops ORDER BY starts_at').all();
}

export function saveStop(
  actor: Actor | null,
  input: { id?: string; name: string; address: string; startsAt: string; endsAt: string; hours: string; visible: boolean; status: 'draft' | 'published' | 'cancelled' },
) {
  const user = requireAction(actor, 'locations.write');
  if (!input.name.trim() || !input.address.trim() || !input.startsAt || !input.endsAt) throw new Error('Name, address, and schedule are required.');
  if (input.endsAt < input.startsAt) throw new Error('The end time must be after the start time.');
  const stamp = now();
  if (input.id) {
    const before = db().prepare('SELECT * FROM truck_stops WHERE id = ?').get(input.id);
    if (!before) throw new Error('Stop not found.');
    db()
      .prepare('UPDATE truck_stops SET name = ?, address = ?, starts_at = ?, ends_at = ?, hours = ?, visible = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(input.name.trim(), input.address.trim(), input.startsAt, input.endsAt, input.hours.trim(), input.visible ? 1 : 0, input.status, stamp, input.id);
    writeAudit(user, 'stop.update', 'truck_stop', input.id, before, db().prepare('SELECT * FROM truck_stops WHERE id = ?').get(input.id));
    return input.id;
  }
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO truck_stops (id, name, address, starts_at, ends_at, hours, status, visible, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.name.trim(), input.address.trim(), input.startsAt, input.endsAt, input.hours.trim(), input.status, input.visible ? 1 : 0, stamp);
  writeAudit(user, 'stop.create', 'truck_stop', id, null, { name: input.name.trim(), visible: input.visible });
  return id;
}

export function listPackages(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  return db().prepare('SELECT * FROM catering_packages ORDER BY sort_order, name').all();
}

export function savePackage(actor: Actor | null, input: { id?: string; name: string; description: string; pricingNote: string; status: ContentStatus }) {
  const user = requireAction(actor, 'catering.write');
  if (!input.name.trim()) throw new Error('Enter a package name.');
  const stamp = now();
  if (input.id) {
    const before = db().prepare('SELECT * FROM catering_packages WHERE id = ?').get(input.id);
    db()
      .prepare('UPDATE catering_packages SET name = ?, description = ?, pricing_note = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(input.name.trim(), input.description.trim(), input.pricingNote.trim(), input.status, stamp, input.id);
    writeAudit(user, 'package.update', 'catering_package', input.id, before, db().prepare('SELECT * FROM catering_packages WHERE id = ?').get(input.id));
    return input.id;
  }
  const id = randomUUID();
  const order = db().prepare('SELECT COALESCE(MAX(sort_order), -1) AS value FROM catering_packages').get() as { value: number };
  db()
    .prepare(
      `INSERT INTO catering_packages (id, name, description, pricing_note, sort_order, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.name.trim(), input.description.trim(), input.pricingNote.trim(), order.value + 1, input.status, stamp);
  writeAudit(user, 'package.create', 'catering_package', id, null, { name: input.name.trim() });
  return id;
}

export function listInquiries(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  return db().prepare('SELECT * FROM catering_inquiries ORDER BY created_at DESC').all();
}

export function consumeRateLimit(bucket: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const count = db().prepare('SELECT COUNT(*) AS count FROM rate_limits WHERE bucket = ? AND created_at > ?').get(bucket, since) as { count: number };
  if (count.count >= limit) return false;
  db().prepare('INSERT INTO rate_limits (id, bucket, created_at) VALUES (?, ?, ?)').run(randomUUID(), bucket, now());
  return true;
}

export function recordPublicInquiry(input: {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  date: string;
  guests: string;
  location: string;
  details: string;
  submissionId?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const submissionId = input.submissionId && /^[0-9a-f-]{36}$/i.test(input.submissionId) ? input.submissionId : '';
  if (submissionId) {
    const existing = db().prepare('SELECT id, notification_status FROM catering_inquiries WHERE dedupe_key = ?').get(submissionId) as
      | { id: string; notification_status: string }
      | undefined;
    if (existing) return { id: existing.id, duplicate: true, notificationStatus: existing.notification_status };
  }
  const recentSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = db()
    .prepare('SELECT id, notification_status FROM catering_inquiries WHERE email = ? AND event_date = ? AND event_type = ? AND created_at > ?')
    .get(email, input.date, input.eventType, recentSince) as { id: string; notification_status: string } | undefined;
  if (recent) return { id: recent.id, duplicate: true, notificationStatus: recent.notification_status };
  const id = randomUUID();
  const stamp = now();
  withTransaction(() => {
    db()
      .prepare(
        `INSERT INTO catering_inquiries
         (id, name, email, phone, event_type, event_date, guests, location, details, status, internal_note, created_at, updated_at, notification_status, notification_error, notification_attempts, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', '', ?, ?, 'pending', '', 0, ?)`,
      )
      .run(
        id,
        plainText(input.name, 120),
        email,
        plainText(input.phone, 40),
        plainText(input.eventType, 80),
        input.date,
        plainText(input.guests, 10),
        plainText(input.location, 200),
        plainText(input.details, 2000),
        stamp,
        stamp,
        submissionId || null,
      );
  });
  return { id, duplicate: false, notificationStatus: 'pending' };
}

export async function deliverInquiryNotification(id: string) {
  const row = db().prepare('SELECT * FROM catering_inquiries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Inquiry not found.');
  if (row.notification_status === 'sent') return { status: 'sent' as const, accepted: true, error: '' };
  if (Number(row.notification_attempts) >= 3) {
    return { status: 'failed' as const, accepted: false, error: String(row.notification_error || 'Delivery stopped after three attempts.') };
  }
  if (mailProvider() === 'unconfigured') {
    db().prepare('UPDATE catering_inquiries SET notification_status = ?, updated_at = ? WHERE id = ?').run('pending', now(), id);
    return { status: 'pending' as const, accepted: false, error: '' };
  }
  const result = await sendRestaurantEmail({
    to: publicEmail(),
    subject: "Fluffy's Bistro catering inquiry",
    text: `Inquiry ${id}\n${row.name}\n${row.email}\n${row.event_type} on ${row.event_date}\nGuests: ${row.guests}\nLocation: ${row.location}\n${row.details || ''}`,
  });
  const status = result.accepted ? 'sent' : result.status === 'pending' ? 'pending' : 'failed';
  db()
    .prepare('UPDATE catering_inquiries SET notification_status = ?, notification_error = ?, notification_attempts = notification_attempts + 1, updated_at = ? WHERE id = ?')
    .run(status, result.error, now(), id);
  return { status, accepted: result.accepted, error: result.error, transient: result.transient };
}

export async function retryInquiryNotification(actor: Actor | null, id: string) {
  requireAction(actor, 'catering.write');
  return deliverInquiryNotification(id);
}

export function updateInquiry(actor: Actor | null, id: string, status: InquiryStatus, note: string) {
  const user = requireAction(actor, 'catering.write');
  if (!inquiryStatuses.includes(status)) throw new Error('Choose a valid inquiry status.');
  const before = db().prepare('SELECT * FROM catering_inquiries WHERE id = ?').get(id);
  if (!before) throw new Error('Inquiry not found.');
  db().prepare('UPDATE catering_inquiries SET status = ?, internal_note = ?, updated_at = ? WHERE id = ?').run(status, note.trim(), now(), id);
  writeAudit(user, 'inquiry.update', 'catering_inquiry', id, before, db().prepare('SELECT * FROM catering_inquiries WHERE id = ?').get(id));
}

export function listPromotions(actor: Actor | null) {
  requireAction(actor, 'promotions.read');
  return db().prepare('SELECT * FROM promotions ORDER BY updated_at DESC').all();
}

export function savePromotion(
  actor: Actor | null,
  input: { id?: string; title: string; body: string; href: string; kind: string; startsAt: string; endsAt: string; active: boolean; status: ContentStatus },
) {
  const user = requireAction(actor, 'promotions.write');
  if (!input.title.trim()) throw new Error('Enter a promotion title.');
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) throw new Error('The end date must be after the start date.');
  const stamp = now();
  if (input.id) {
    const before = db().prepare('SELECT * FROM promotions WHERE id = ?').get(input.id);
    db()
      .prepare('UPDATE promotions SET title = ?, body = ?, href = ?, kind = ?, starts_at = ?, ends_at = ?, active = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(input.title.trim(), input.body.trim(), safeUrl(input.href), input.kind, input.startsAt || null, input.endsAt || null, input.active ? 1 : 0, input.status, stamp, input.id);
    writeAudit(user, 'promotion.update', 'promotion', input.id, before, db().prepare('SELECT * FROM promotions WHERE id = ?').get(input.id));
    return input.id;
  }
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO promotions (id, title, body, href, kind, starts_at, ends_at, active, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.title.trim(), input.body.trim(), safeUrl(input.href), input.kind || 'banner', input.startsAt || null, input.endsAt || null, input.active ? 1 : 0, input.status, stamp);
  writeAudit(user, 'promotion.create', 'promotion', id, null, { title: input.title.trim() });
  return id;
}

export function readSiteDocument(actor: Actor | null) {
  requireAction(actor, 'content.read');
  const row = db().prepare('SELECT * FROM site_documents WHERE id = ?').get('website') as { draft_json: string; published_json: string | null } | undefined;
  return {
    draft: row ? (JSON.parse(row.draft_json) as SiteContent) : defaultSiteContent,
    published: row?.published_json ? (JSON.parse(row.published_json) as SiteContent) : null,
  };
}

function cleanSite(input: SiteContent) {
  return cleanSiteContent(input);
}

export function saveSiteDraft(actor: Actor | null, input: SiteContent) {
  const user = requireAction(actor, 'content.write');
  const content = cleanSite(input);
  const before = db().prepare('SELECT draft_json FROM site_documents WHERE id = ?').get('website');
  db().prepare('UPDATE site_documents SET draft_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(content), now(), 'website');
  writeAudit(user, 'content.draft', 'site_content', 'website', before, { draft: content });
}

export function publishSite(actor: Actor | null) {
  const user = requireAction(actor, 'content.write');
  const row = db().prepare('SELECT * FROM site_documents WHERE id = ?').get('website') as { draft_json: string; published_json: string | null };
  if (row.published_json) {
    db().prepare('INSERT INTO site_revisions (id, document_id, published_json, created_at) VALUES (?, ?, ?, ?)').run(randomUUID(), 'website', row.published_json, now());
  }
  db().prepare('UPDATE site_documents SET published_json = draft_json, updated_at = ? WHERE id = ?').run(now(), 'website');
  writeAudit(user, 'content.publish', 'site_content', 'website', { published: row.published_json }, { published: row.draft_json });
}

export function rollbackSite(actor: Actor | null) {
  const user = requireAction(actor, 'content.write');
  const revision = db().prepare('SELECT * FROM site_revisions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1').get('website') as
    | { id: string; published_json: string }
    | undefined;
  if (!revision) throw new Error('There is no earlier published version to restore.');
  const before = db().prepare('SELECT published_json FROM site_documents WHERE id = ?').get('website');
  db()
    .prepare('UPDATE site_documents SET draft_json = ?, published_json = ?, updated_at = ? WHERE id = ?')
    .run(revision.published_json, revision.published_json, now(), 'website');
  db().prepare('DELETE FROM site_revisions WHERE id = ?').run(revision.id);
  writeAudit(user, 'content.rollback', 'site_content', 'website', before, { published: revision.published_json });
}

export function listAudit(actor: Actor | null) {
  requireAction(actor, 'activity.read');
  if (actor?.role === 'NOCTARIS_ADMIN') {
    return db().prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all();
  }
  return db()
    .prepare("SELECT * FROM audit_logs WHERE entity_type NOT IN ('user', 'settings', 'session') ORDER BY created_at DESC LIMIT 200")
    .all();
}

export function listUsers(actor: Actor | null) {
  requireAction(actor, 'users.read');
  return db().prepare('SELECT id, email, name, role, disabled, created_at FROM users ORDER BY created_at').all();
}

export function inviteOwner(actor: Actor | null, input: { name: string; email: string; password: string; role: Role }) {
  const user = requireAction(actor, 'users.write');
  if (actor?.role !== 'NOCTARIS_ADMIN') throw new Error('Only Noctaris can manage accounts.');
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 10) throw new Error('Use a password of at least 10 characters.');
  if (input.role !== 'OWNER' && input.role !== 'NOCTARIS_ADMIN') throw new Error('Choose a valid role.');
  const existing = db().prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('An account with that email already exists.');
  const id = randomUUID();
  db()
    .prepare('INSERT INTO users (id, email, name, role, password_hash, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .run(id, email, input.name.trim() || email, input.role, hashPassword(input.password), now());
  writeAudit(user, 'user.invite', 'user', id, null, { email, role: input.role });
  return id;
}

export function setUserDisabled(actor: Actor | null, id: string, disabled: boolean) {
  const user = requireAction(actor, 'users.write');
  if (id === actor?.id) throw new Error('You cannot disable your own account.');
  const before = db().prepare('SELECT id, email, role, disabled FROM users WHERE id = ?').get(id) as { role: Role } | undefined;
  if (!before) throw new Error('Account not found.');
  if (before.role === 'NOCTARIS_ADMIN' && disabled) {
    const remaining = db().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'NOCTARIS_ADMIN' AND disabled = 0 AND id != ?").get(id) as {
      count: number;
    };
    if (remaining.count < 1) throw new Error('Keep at least one active Noctaris admin.');
  }
  db().prepare('UPDATE users SET disabled = ? WHERE id = ?').run(disabled ? 1 : 0, id);
  if (disabled) db().prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  writeAudit(user, disabled ? 'user.disable' : 'user.enable', 'user', id, before, { disabled });
}

export function readSettings(actor: Actor | null) {
  requireAction(actor, 'settings.read');
  const rows = db().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function saveMeasurementId(actor: Actor | null, measurementId: string) {
  const user = requireAction(actor, 'settings.write');
  const value = measurementId.trim();
  if (value && !/^G-[A-Z0-9]+$/i.test(value)) throw new Error('Enter a GA4 measurement ID like G-XXXX, or leave it blank.');
  const before = db().prepare('SELECT value FROM settings WHERE key = ?').get('ga_measurement_id');
  db().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('ga_measurement_id', value);
  writeAudit(user, 'settings.analytics', 'settings', 'ga_measurement_id', before, { configured: Boolean(value) });
}

export function diagnostics(actor: Actor | null) {
  requireAction(actor, 'diagnostics.read');
  const users = db().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  const events = db().prepare('SELECT COUNT(*) AS count FROM analytics_events').get() as { count: number };
  return {
    users: users.count,
    events: events.count,
    gaSecretConfigured: Boolean(process.env.GA4_API_SECRET),
    node: process.version,
    readiness: readinessReport(),
    failedNotifications: (db().prepare("SELECT COUNT(*) AS count FROM catering_inquiries WHERE notification_status = 'failed'").get() as { count: number }).count,
  };
}

export function recordAnalytics(input: {
  name: string;
  path: string;
  metadata: Record<string, string>;
  device: string;
  referrerHost: string;
  eventKey?: string;
}) {
  const metadata = Object.fromEntries(Object.entries(input.metadata).filter(([, value]) => !value.includes('@')));
  try {
    db()
      .prepare(
        'INSERT INTO analytics_events (id, name, path, metadata_json, device, referrer_host, created_at, event_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), input.name, input.path.slice(0, 200), JSON.stringify(metadata), input.device, input.referrerHost.slice(0, 120), now(), input.eventKey || null);
    return true;
  } catch (error) {
    if (String(error).includes('UNIQUE')) return false;
    throw error;
  }
}

export function recordStoredImage(
  actor: Actor | null,
  image: { path: string; provider: string; contentType: string; byteSize: number },
) {
  const user = requireAction(actor, 'menu.write');
  const id = randomUUID();
  db()
    .prepare('INSERT INTO stored_images (id, path, provider, content_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, image.path, image.provider, image.contentType, image.byteSize, now());
  writeAudit(user, 'image.upload', 'image', id, null, { path: image.path, provider: image.provider, byteSize: image.byteSize });
  return id;
}

export function notificationSummary(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  const rows = db().prepare('SELECT notification_status, COUNT(*) AS count FROM catering_inquiries GROUP BY notification_status').all() as {
    notification_status: string;
    count: number;
  }[];
  return Object.fromEntries(rows.map((row) => [row.notification_status, row.count]));
}

export function analyticsReport(actor: Actor | null, from: string, to: string) {
  requireAction(actor, 'analytics.read');
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new Error('Choose a valid date range.');
  const span = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - span);
  const rows = db().prepare('SELECT * FROM analytics_events WHERE created_at >= ? AND created_at <= ?').all(start.toISOString(), end.toISOString()) as {
    name: string;
    path: string;
    metadata_json: string;
    device: string;
    referrer_host: string;
  }[];
  const previous = db().prepare('SELECT COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND created_at <= ?').get(previousStart.toISOString(), previousEnd.toISOString()) as {
    count: number;
  };
  const count = (name: string) => rows.filter((row) => row.name === name).length;
  const by = (pick: (row: (typeof rows)[number]) => string) => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = pick(row) || 'Unknown';
      totals.set(key, (totals.get(key) || 0) + 1);
    }
    return [...totals.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
  };
  return {
    from,
    to,
    total: rows.length,
    previousTotal: previous.count,
    menuViews: count('menu_view'),
    itemViews: count('menu_item_view'),
    orderClicks: count('order_link_click'),
    phoneClicks: count('phone_click'),
    inquiries: count('catering_inquiry_submit'),
    locationClicks: count('truck_location_click'),
    promotionClicks: count('promotion_click'),
    providers: by((row) => (row.name === 'order_link_click' ? JSON.parse(row.metadata_json).provider || 'Unknown' : '')).filter((entry) => entry.label),
    devices: by((row) => row.device),
    sources: by((row) => row.referrer_host || 'Direct'),
    pages: by((row) => row.path || '/'),
    items: by((row) => (row.name === 'menu_item_view' ? JSON.parse(row.metadata_json).category || 'Menu' : '')).filter((entry) => entry.label),
  };
}

function readyDatabase() {
  if (!databaseExists()) return null;
  return db();
}

export function publishedMenu(preview = false) {
  const database = readyDatabase();
  if (!database) return null;
  const total = database.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
  if (!total.count) return null;
  const categories = database
    .prepare(`SELECT * FROM categories WHERE status = 'published' ${preview ? "OR status = 'draft'" : ''} ORDER BY sort_order, name`)
    .all() as Record<string, unknown>[];
  const items = database
    .prepare(`SELECT * FROM menu_items WHERE status = 'published' ${preview ? "OR status = 'draft'" : ''} ORDER BY sort_order, name`)
    .all() as Record<string, unknown>[];
  return categories
    .filter((category) => category.status === 'published' || preview)
    .map((category) => ({
      id: String(category.id),
      name: String(category.name),
      description: String(category.description),
      image: String(category.image),
      imageAlt: String(category.image_alt),
      imagePosition: category.image_position ? String(category.image_position) : undefined,
      items: items
        .filter((item) => item.category_id === category.id && (item.status === 'published' || preview))
        .map((item) => ({
          id: String(item.id),
          name: String(item.name),
          note: item.note ? String(item.note) : undefined,
          priceCents: item.price_cents == null ? null : Number(item.price_cents),
          available: Boolean(item.available),
          featured: Boolean(item.featured),
          image: item.image ? String(item.image) : null,
        })),
    }));
}

export function publishedSite() {
  const database = readyDatabase();
  if (!database) return null;
  const row = database.prepare("SELECT published_json FROM site_documents WHERE id = 'website'").get() as { published_json: string | null } | undefined;
  if (!row?.published_json) return null;
  return JSON.parse(row.published_json) as SiteContent;
}

export function publishedStops(today = new Date().toISOString()) {
  const database = readyDatabase();
  if (!database) return [];
  return database
    .prepare("SELECT * FROM truck_stops WHERE status = 'published' AND visible = 1 AND ends_at >= ? ORDER BY starts_at")
    .all(today.slice(0, 16)) as Record<string, unknown>[];
}

export function activePromotions(today = new Date().toISOString().slice(0, 10)) {
  const database = readyDatabase();
  if (!database) return [];
  return database
    .prepare(
      `SELECT * FROM promotions
       WHERE status = 'published' AND active = 1
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (ends_at IS NULL OR ends_at >= ?)
       ORDER BY updated_at DESC`,
    )
    .all(today, today) as Record<string, unknown>[];
}

export function publishedPackages() {
  const database = readyDatabase();
  if (!database) return [];
  return database.prepare("SELECT * FROM catering_packages WHERE status = 'published' ORDER BY sort_order, name").all() as Record<string, unknown>[];
}

export function publicEmail() {
  return publishedSite()?.email || contact.email;
}

export function measurementId() {
  const database = readyDatabase();
  if (!database) return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  const row = database.prepare("SELECT value FROM settings WHERE key = 'ga_measurement_id'").get() as { value: string } | undefined;
  return row?.value || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
}
