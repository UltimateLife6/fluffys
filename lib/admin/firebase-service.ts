import { createHash, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { adminAuth, firestore, usingFirebaseEmulator } from '@/lib/admin/firebase-app';
import { publicFirebaseApp } from '@/lib/admin/firebase-web';
import { sendRestaurantEmail, mailProvider } from '@/lib/admin/mail';
import { assertCan, redact, type Actor, type AdminAction, type Role } from '@/lib/admin/permissions';
import { readinessReport } from '@/lib/admin/readiness';
import { bucketKey, plainText, safeUrl, sessionPolicy } from '@/lib/admin/security';
import { dailyEventCounts } from '@/lib/admin/analytics-series';
import { cleanSiteContent, defaultSiteContent, type SiteContent } from '@/lib/admin/site-defaults';
import { contact } from '@/lib/data';
import type { ContentStatus, InquiryStatus } from '@/lib/admin/service';

const inquiryStatuses = ['email_prepared', 'received', 'reviewing', 'contacted', 'quoted', 'booked', 'closed'] as const;
const sessionMs = 12 * 60 * 60 * 1000;

function now() {
  return new Date().toISOString();
}

function hashToken(token: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

function requireAction(actor: Actor | null, action: AdminAction) {
  assertCan(actor, action);
  return actor as Actor;
}

function db() {
  return firestore();
}

async function all(collection: string) {
  const snap = await db().collection(collection).get();
  return snap.docs.map((doc) => doc.data() as Record<string, unknown>);
}

async function one(collection: string, id: string) {
  const snap = await db().collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
}

async function put(collection: string, id: string, data: Record<string, unknown>) {
  await db().collection(collection).doc(id).set(data);
}

function sortBy(rows: Record<string, unknown>[], keys: string[], direction: 'asc' | 'desc' = 'asc') {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const a = left[key];
      const b = right[key];
      const compared = typeof a === 'number' && typeof b === 'number' ? a - b : String(a ?? '').localeCompare(String(b ?? ''));
      if (compared) return compared * factor;
    }
    return 0;
  });
}

function money(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error('Enter a price like 12 or 12.50, or leave it blank.');
  return Math.round(Number(trimmed) * 100);
}

function parseContent(value: unknown): SiteContent | null {
  if (!value) return null;
  if (typeof value === 'string') return JSON.parse(value) as SiteContent;
  return value as SiteContent;
}

async function writeAudit(actor: Actor, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  const id = randomUUID();
  await put('auditLogs', id, {
    id,
    user_id: actor.id,
    role: actor.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_json: before == null ? null : JSON.stringify(redact(before)),
    after_json: after == null ? null : JSON.stringify(redact(after)),
    created_at: now(),
  });
}

function sameLoginError() {
  return { ok: false as const, error: 'Email or password is incorrect.' };
}

async function emailLocked(email: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const snap = await db().collection('loginAttempts').doc(bucketKey('email', email)).get();
  const hits = ((snap.data()?.hits as string[]) || []).filter((hit) => hit > since);
  return hits.length >= 5;
}

async function recordEmailFailure(email: string) {
  const ref = db().collection('loginAttempts').doc(bucketKey('email', email));
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const hits = ((snap.data()?.hits as string[]) || []).filter((hit) => hit > since);
    hits.push(now());
    tx.set(ref, { hits });
  });
}

async function signInRest(email: string, password: string) {
  publicFirebaseApp();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key';
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host && process.env.FIREBASE_ALLOW_REMOTE !== '1') throw new Error('Refusing remote Firebase Auth.');
  const url = host
    ? `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`
    : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(8000),
  });
  return (await response.json()) as { idToken?: string; localId?: string; error?: { message?: string } };
}

export async function pingFirestore() {
  await db().collection('siteSettings').limit(1).get();
}

export async function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const dummy = scryptSync(password, 'ab'.repeat(16), 64);
  timingSafeEqual(dummy, dummy);
  if (await emailLocked(normalized)) return { ok: false as const, error: 'Too many attempts. Try again in a few minutes.' };
  const payload = await signInRest(normalized, password).catch(() => null);
  if (!payload?.idToken || !payload.localId) {
    await recordEmailFailure(normalized);
    return sameLoginError();
  }
  const account = await adminAuth().getUser(payload.localId);
  const profile = await one('adminUsers', account.uid);
  const role = account.customClaims?.role;
  if (account.disabled || !profile || profile.disabled || (role !== 'OWNER' && role !== 'NOCTARIS_ADMIN') || profile.role !== role) {
    return sameLoginError();
  }
  return {
    ok: true as const,
    idToken: payload.idToken,
    actor: { id: account.uid, email: String(profile.email), name: String(profile.name), role: role as Role },
  };
}

export async function createSession(actor: Actor, idToken = '') {
  if (!idToken) throw new Error('Sign in to continue.');
  const token = await adminAuth().createSessionCookie(idToken, { expiresIn: sessionMs });
  const stamp = now();
  const expires = new Date(Date.now() + sessionMs).toISOString();
  await put('sessions', hashToken(token), {
    id: hashToken(token),
    user_id: actor.id,
    expires_at: expires,
    created_at: stamp,
    last_seen_at: stamp,
  });
  return { token, expires };
}

export async function actorFromToken(token: string | undefined) {
  if (!token) return null;
  let uid = '';
  let role: Role | undefined;
  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    uid = decoded.uid;
    role = decoded.role as Role | undefined;
  } catch {
    return null;
  }
  const sessionId = hashToken(token);
  const session = await one('sessions', sessionId);
  if (!session || String(session.user_id) !== uid) return null;
  if (String(session.expires_at) < now()) {
    await db().collection('sessions').doc(sessionId).delete();
    return null;
  }
  const seen = String(session.last_seen_at || session.created_at);
  if (Date.now() - Date.parse(seen) > sessionPolicy.idleTimeoutMs) {
    await db().collection('sessions').doc(sessionId).delete();
    await adminAuth().revokeRefreshTokens(uid).catch(() => undefined);
    return null;
  }
  if (Date.now() - Date.parse(seen) > 5 * 60 * 1000) {
    await db().collection('sessions').doc(sessionId).update({ last_seen_at: now() });
  }
  const profile = await one('adminUsers', uid);
  if (!profile || profile.disabled || profile.role !== role || (role !== 'OWNER' && role !== 'NOCTARIS_ADMIN')) return null;
  return { id: uid, email: String(profile.email), name: String(profile.name), role };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const sessionId = hashToken(token);
  const session = await one('sessions', sessionId);
  await db().collection('sessions').doc(sessionId).delete().catch(() => undefined);
  if (session?.user_id) await adminAuth().revokeRefreshTokens(String(session.user_id)).catch(() => undefined);
}

export async function listCategories(actor: Actor | null, includeArchived = true) {
  requireAction(actor, 'menu.read');
  const categories = sortBy(await all('menuCategories'), ['sort_order', 'name']).filter((category) => includeArchived || category.status !== 'archived');
  const items = sortBy(await all('menuItems'), ['sort_order', 'name']);
  return categories.map((category) => ({
    ...category,
    items: items.filter((item) => item.category_id === category.id),
  }));
}

export async function saveCategory(actor: Actor | null, input: { id?: string; name: string; description: string; image: string; imageAlt: string; imagePosition?: string }) {
  const user = requireAction(actor, 'menu.write');
  const name = input.name.trim();
  if (!name) throw new Error('Enter a category name.');
  const stamp = now();
  if (input.id) {
    const before = await one('menuCategories', input.id);
    if (!before) throw new Error('Category not found.');
    const after = {
      ...before,
      name,
      description: input.description.trim(),
      image: input.image.trim(),
      image_alt: input.imageAlt.trim(),
      image_position: input.imagePosition?.trim() || null,
      updated_at: stamp,
    };
    await put('menuCategories', input.id, after);
    await writeAudit(user, 'category.update', 'category', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  const existing = await all('menuCategories');
  const order = existing.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), -1) + 1;
  await put('menuCategories', id, {
    id,
    name,
    description: input.description.trim(),
    image: input.image.trim() || '/food/sides.jpg',
    image_alt: input.imageAlt.trim() || name,
    image_position: input.imagePosition?.trim() || null,
    sort_order: order,
    status: 'draft',
    updated_at: stamp,
  });
  await writeAudit(user, 'category.create', 'category', id, null, { name });
  return id;
}

export async function setCategoryStatus(actor: Actor | null, id: string, status: ContentStatus) {
  const user = requireAction(actor, 'menu.write');
  const before = await one('menuCategories', id);
  if (!before) throw new Error('Category not found.');
  const after = { ...before, status, updated_at: now() };
  await put('menuCategories', id, after);
  await writeAudit(user, `category.${status}`, 'category', id, before, after);
}

export async function moveCategory(actor: Actor | null, id: string, direction: -1 | 1) {
  const user = requireAction(actor, 'menu.write');
  const rows = sortBy(await all('menuCategories'), ['sort_order', 'name']);
  const index = rows.findIndex((row) => row.id === id);
  const swap = rows[index + direction];
  if (index < 0 || !swap) return;
  const current = rows[index];
  await db().runTransaction(async (tx) => {
    const currentRef = db().collection('menuCategories').doc(String(current.id));
    const swapRef = db().collection('menuCategories').doc(String(swap.id));
    tx.update(currentRef, { sort_order: swap.sort_order });
    tx.update(swapRef, { sort_order: current.sort_order });
  });
  await writeAudit(user, 'category.reorder', 'category', id, { sort_order: current.sort_order }, { sort_order: swap.sort_order });
}

export async function saveMenuItem(
  actor: Actor | null,
  input: { id?: string; categoryId: string; name: string; note: string; price: string; available: boolean; featured: boolean; image?: string | null },
) {
  const user = requireAction(actor, 'menu.write');
  const name = input.name.trim();
  if (!name) throw new Error('Enter an item name.');
  if (!(await one('menuCategories', input.categoryId))) throw new Error('Choose a category.');
  const price = money(input.price);
  const stamp = now();
  if (input.id) {
    const before = await one('menuItems', input.id);
    if (!before) throw new Error('Menu item not found.');
    const after = {
      ...before,
      category_id: input.categoryId,
      name,
      note: plainText(input.note, 500),
      price_cents: price,
      available: input.available ? 1 : 0,
      featured: input.featured ? 1 : 0,
      image: input.image || null,
      updated_at: stamp,
    };
    await put('menuItems', input.id, after);
    await writeAudit(user, 'menu_item.update', 'menu_item', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  const siblings = (await all('menuItems')).filter((item) => item.category_id === input.categoryId);
  const order = siblings.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), -1) + 1;
  await put('menuItems', id, {
    id,
    category_id: input.categoryId,
    name,
    note: plainText(input.note, 500),
    price_cents: price,
    available: input.available ? 1 : 0,
    featured: input.featured ? 1 : 0,
    image: input.image || null,
    sort_order: order,
    status: 'draft',
    updated_at: stamp,
  });
  await writeAudit(user, 'menu_item.create', 'menu_item', id, null, { name, price_cents: price, available: input.available });
  return id;
}

export async function setMenuItemStatus(actor: Actor | null, id: string, status: ContentStatus) {
  const user = requireAction(actor, 'menu.write');
  const before = await one('menuItems', id);
  if (!before) throw new Error('Menu item not found.');
  const after = { ...before, status, updated_at: now() };
  await put('menuItems', id, after);
  await writeAudit(user, `menu_item.${status}`, 'menu_item', id, before, after);
}

export async function moveMenuItem(actor: Actor | null, id: string, direction: -1 | 1) {
  const user = requireAction(actor, 'menu.write');
  const item = await one('menuItems', id);
  if (!item) return;
  const rows = sortBy(
    (await all('menuItems')).filter((row) => row.category_id === item.category_id),
    ['sort_order', 'name'],
  );
  const index = rows.findIndex((row) => row.id === id);
  const swap = rows[index + direction];
  if (!swap) return;
  await db().runTransaction(async (tx) => {
    tx.update(db().collection('menuItems').doc(id), { sort_order: swap.sort_order });
    tx.update(db().collection('menuItems').doc(String(swap.id)), { sort_order: item.sort_order });
  });
  await writeAudit(user, 'menu_item.reorder', 'menu_item', id, { sort_order: item.sort_order }, { sort_order: swap.sort_order });
}

export async function listStops(actor: Actor | null) {
  requireAction(actor, 'locations.read');
  return sortBy(await all('truckStops'), ['starts_at']);
}

export async function saveStop(
  actor: Actor | null,
  input: { id?: string; name: string; address: string; startsAt: string; endsAt: string; hours: string; visible: boolean; status: 'draft' | 'published' | 'cancelled' },
) {
  const user = requireAction(actor, 'locations.write');
  if (!input.name.trim() || !input.address.trim() || !input.startsAt || !input.endsAt) throw new Error('Name, address, and schedule are required.');
  if (input.endsAt < input.startsAt) throw new Error('The end time must be after the start time.');
  const stamp = now();
  const fields = {
    name: input.name.trim(),
    address: input.address.trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    hours: input.hours.trim(),
    visible: input.visible ? 1 : 0,
    status: input.status,
    updated_at: stamp,
  };
  if (input.id) {
    const before = await one('truckStops', input.id);
    if (!before) throw new Error('Stop not found.');
    const after = { ...before, ...fields };
    await put('truckStops', input.id, after);
    await writeAudit(user, 'stop.update', 'truck_stop', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  await put('truckStops', id, { id, ...fields });
  await writeAudit(user, 'stop.create', 'truck_stop', id, null, { name: fields.name, visible: input.visible });
  return id;
}

export async function listPackages(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  return sortBy(await all('cateringPackages'), ['sort_order', 'name']);
}

export async function savePackage(actor: Actor | null, input: { id?: string; name: string; description: string; pricingNote: string; status: ContentStatus }) {
  const user = requireAction(actor, 'catering.write');
  if (!input.name.trim()) throw new Error('Enter a package name.');
  const stamp = now();
  if (input.id) {
    const before = await one('cateringPackages', input.id);
    if (!before) throw new Error('Package not found.');
    const after = {
      ...before,
      name: input.name.trim(),
      description: input.description.trim(),
      pricing_note: input.pricingNote.trim(),
      status: input.status,
      updated_at: stamp,
    };
    await put('cateringPackages', input.id, after);
    await writeAudit(user, 'package.update', 'catering_package', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  const order = (await all('cateringPackages')).reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), -1) + 1;
  await put('cateringPackages', id, {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    pricing_note: input.pricingNote.trim(),
    sort_order: order,
    status: input.status,
    updated_at: stamp,
  });
  await writeAudit(user, 'package.create', 'catering_package', id, null, { name: input.name.trim() });
  return id;
}

export async function listInquiries(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  return sortBy(await all('cateringInquiries'), ['created_at'], 'desc');
}

export async function consumeRateLimit(bucket: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const ref = db().collection('rateLimits').doc(bucket);
  let allowed = false;
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const hits = ((snap.data()?.hits as string[]) || []).filter((hit) => hit > since);
    if (hits.length >= limit) {
      allowed = false;
      return;
    }
    hits.push(now());
    tx.set(ref, { hits });
    allowed = true;
  });
  return allowed;
}

export async function recordPublicInquiry(input: {
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
  const recentKey = createHash('sha256').update(`${email}|${input.date}|${input.eventType}`).digest('hex');
  const recentSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const id = randomUUID();
  const stamp = now();
  const saved: { id: string; duplicate: boolean; notificationStatus: string } = { id, duplicate: false, notificationStatus: 'pending' };
  await db().runTransaction(async (tx) => {
    const keys = db().collection('inquiryKeys');
    const submissionRef = submissionId ? keys.doc(submissionId) : null;
    const recentRef = keys.doc(recentKey);
    const submission = submissionRef ? await tx.get(submissionRef) : null;
    const recent = await tx.get(recentRef);
    const existingId = submission?.exists ? String(submission.data()?.inquiry_id || '') : recent.exists && String(recent.data()?.created_at || '') > recentSince ? String(recent.data()?.inquiry_id || '') : '';
    if (existingId) {
      const existing = await tx.get(db().collection('cateringInquiries').doc(existingId));
      saved.id = existingId;
      saved.duplicate = true;
      saved.notificationStatus = String(existing.data()?.notification_status || 'pending');
      return;
    }
    const record = {
      id,
      name: plainText(input.name, 120),
      email,
      phone: plainText(input.phone, 40),
      event_type: plainText(input.eventType, 80),
      event_date: input.date,
      guests: plainText(input.guests, 10),
      location: plainText(input.location, 200),
      details: plainText(input.details, 2000),
      status: 'received',
      internal_note: '',
      created_at: stamp,
      updated_at: stamp,
      notification_status: 'pending',
      notification_error: '',
      notification_attempts: 0,
      dedupe_key: submissionId || null,
    };
    tx.set(db().collection('cateringInquiries').doc(id), record);
    if (submissionRef) tx.set(submissionRef, { inquiry_id: id, created_at: stamp });
    tx.set(recentRef, { inquiry_id: id, created_at: stamp });
  });
  return saved;
}

export async function deliverInquiryNotification(id: string) {
  const row = await one('cateringInquiries', id);
  if (!row) throw new Error('Inquiry not found.');
  if (row.notification_status === 'sent') return { status: 'sent' as const, accepted: true, error: '' };
  if (Number(row.notification_attempts) >= 3) {
    return { status: 'failed' as const, accepted: false, error: String(row.notification_error || 'Delivery stopped after three attempts.') };
  }
  if (mailProvider() === 'unconfigured') {
    await db().collection('cateringInquiries').doc(id).update({ notification_status: 'pending', updated_at: now() });
    return { status: 'pending' as const, accepted: false, error: '' };
  }
  const result = await sendRestaurantEmail({
    to: await publicEmail(),
    subject: "Fluffy's Bistro catering inquiry",
    text: `Inquiry ${id}\n${row.name}\n${row.email}\n${row.event_type} on ${row.event_date}\nGuests: ${row.guests}\nLocation: ${row.location}\n${row.details || ''}`,
  });
  const status = result.accepted ? 'sent' : result.status === 'pending' ? 'pending' : 'failed';
  const attempts = Number(row.notification_attempts) + 1;
  await db().collection('cateringInquiries').doc(id).update({
    notification_status: status,
    notification_error: result.error,
    notification_attempts: attempts,
    updated_at: now(),
  });
  const attemptId = randomUUID();
  await put('notificationAttempts', attemptId, {
    id: attemptId,
    inquiry_id: id,
    status,
    error: result.error,
    created_at: now(),
  });
  return { status, accepted: result.accepted, error: result.error, transient: result.transient };
}

export async function retryInquiryNotification(actor: Actor | null, id: string) {
  requireAction(actor, 'catering.write');
  return deliverInquiryNotification(id);
}

export async function updateInquiry(actor: Actor | null, id: string, status: InquiryStatus, note: string) {
  const user = requireAction(actor, 'catering.write');
  if (!inquiryStatuses.includes(status)) throw new Error('Choose a valid inquiry status.');
  const before = await one('cateringInquiries', id);
  if (!before) throw new Error('Inquiry not found.');
  const after = { ...before, status, internal_note: note.trim(), updated_at: now() };
  await put('cateringInquiries', id, after);
  await writeAudit(user, 'inquiry.update', 'catering_inquiry', id, before, after);
}

export async function listPromotions(actor: Actor | null) {
  requireAction(actor, 'promotions.read');
  return sortBy(await all('promotions'), ['updated_at'], 'desc');
}

export async function savePromotion(
  actor: Actor | null,
  input: { id?: string; title: string; body: string; href: string; kind: string; startsAt: string; endsAt: string; active: boolean; status: ContentStatus },
) {
  const user = requireAction(actor, 'promotions.write');
  if (!input.title.trim()) throw new Error('Enter a promotion title.');
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) throw new Error('The end date must be after the start date.');
  const stamp = now();
  const fields = {
    title: input.title.trim(),
    body: input.body.trim(),
    href: safeUrl(input.href),
    kind: input.kind || 'banner',
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    active: input.active ? 1 : 0,
    status: input.status,
    updated_at: stamp,
  };
  if (input.id) {
    const before = await one('promotions', input.id);
    if (!before) throw new Error('Promotion not found.');
    const after = { ...before, ...fields };
    await put('promotions', input.id, after);
    await writeAudit(user, 'promotion.update', 'promotion', input.id, before, after);
    return input.id;
  }
  const id = randomUUID();
  await put('promotions', id, { id, ...fields });
  await writeAudit(user, 'promotion.create', 'promotion', id, null, { title: fields.title });
  return id;
}

export async function readSiteDocument(actor: Actor | null) {
  requireAction(actor, 'content.read');
  const row = await one('siteContent', 'website');
  return {
    draft: parseContent(row?.draft_json) || defaultSiteContent,
    published: parseContent(row?.published_json),
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

export async function saveSiteDraft(actor: Actor | null, input: SiteContent) {
  const user = requireAction(actor, 'content.write');
  const content = cleanSiteContent(input);
  const before = await one('siteContent', 'website');
  await put('siteContent', 'website', {
    id: 'website',
    draft_json: JSON.stringify(content),
    published_json: before?.published_json ?? null,
    updated_at: now(),
  });
  await writeAudit(user, 'content.draft', 'site_content', 'website', before ? { draft_json: before.draft_json } : null, { draft: content });
}

export async function publishSite(actor: Actor | null) {
  const user = requireAction(actor, 'content.write');
  const row = await one('siteContent', 'website');
  if (!row?.draft_json) throw new Error('Save a draft before publishing.');
  const revisionId = randomUUID();
  await db().runTransaction(async (tx) => {
    const ref = db().collection('siteContent').doc('website');
    const current = await tx.get(ref);
    const published = current.data()?.published_json;
    if (published) {
      tx.set(db().collection('siteRevisions').doc(revisionId), {
        id: revisionId,
        document_id: 'website',
        published_json: published,
        created_at: now(),
      });
    }
    tx.set(ref, { ...current.data(), id: 'website', published_json: current.data()?.draft_json, updated_at: now() });
  });
  await writeAudit(user, 'content.publish', 'site_content', 'website', { published: row.published_json }, { published: row.draft_json });
}

export async function rollbackSite(actor: Actor | null) {
  const user = requireAction(actor, 'content.write');
  const revisions = sortBy(
    (await all('siteRevisions')).filter((row) => row.document_id === 'website'),
    ['created_at'],
    'desc',
  );
  const revision = revisions[0];
  if (!revision) throw new Error('There is no earlier published version to restore.');
  const before = await one('siteContent', 'website');
  await put('siteContent', 'website', {
    id: 'website',
    draft_json: revision.published_json,
    published_json: revision.published_json,
    updated_at: now(),
  });
  await db().collection('siteRevisions').doc(String(revision.id)).delete();
  await writeAudit(user, 'content.rollback', 'site_content', 'website', before ? { published_json: before.published_json } : null, {
    published: revision.published_json,
  });
}

export async function listAudit(actor: Actor | null) {
  requireAction(actor, 'activity.read');
  const rows = sortBy(await all('auditLogs'), ['created_at'], 'desc');
  const visible = actor?.role === 'NOCTARIS_ADMIN' ? rows : rows.filter((row) => !['user', 'settings', 'session'].includes(String(row.entity_type)));
  return visible.slice(0, 200);
}

export async function listUsers(actor: Actor | null) {
  requireAction(actor, 'users.read');
  return sortBy(await all('adminUsers'), ['created_at']).map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    disabled: user.disabled,
    created_at: user.created_at,
  }));
}

export async function inviteOwner(actor: Actor | null, input: { name: string; email: string; password: string; role: Role }) {
  const user = requireAction(actor, 'users.write');
  if (actor?.role !== 'NOCTARIS_ADMIN') throw new Error('Only Noctaris can manage accounts.');
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (input.password.length < 10) throw new Error('Use a password of at least 10 characters.');
  if (input.role !== 'OWNER' && input.role !== 'NOCTARIS_ADMIN') throw new Error('Choose a valid role.');
  const existing = (await all('adminUsers')).find((row) => row.email === email);
  if (existing) throw new Error('An account with that email already exists.');
  const id = randomUUID();
  await adminAuth().createUser({ uid: id, email, password: input.password, displayName: input.name.trim() || email, disabled: false });
  await adminAuth().setCustomUserClaims(id, { role: input.role });
  await put('adminUsers', id, { id, email, name: input.name.trim() || email, role: input.role, disabled: 0, created_at: now() });
  await writeAudit(user, 'user.invite', 'user', id, null, { email, role: input.role });
  return id;
}

export async function setUserDisabled(actor: Actor | null, id: string, disabled: boolean) {
  const user = requireAction(actor, 'users.write');
  if (id === actor?.id) throw new Error('You cannot disable your own account.');
  const before = await one('adminUsers', id);
  if (!before) throw new Error('Account not found.');
  if (before.role === 'NOCTARIS_ADMIN' && disabled) {
    const remaining = (await all('adminUsers')).filter((row) => row.role === 'NOCTARIS_ADMIN' && !row.disabled && row.id !== id);
    if (!remaining.length) throw new Error('Keep at least one active Noctaris admin.');
  }
  await adminAuth().updateUser(id, { disabled });
  if (disabled) await adminAuth().revokeRefreshTokens(id);
  await db().collection('adminUsers').doc(id).update({ disabled: disabled ? 1 : 0 });
  if (disabled) {
    const sessions = await db().collection('sessions').where('user_id', '==', id).get();
    await Promise.all(sessions.docs.map((doc) => doc.ref.delete()));
  }
  await writeAudit(user, disabled ? 'user.disable' : 'user.enable', 'user', id, { id: before.id, email: before.email, role: before.role, disabled: before.disabled }, { disabled });
}

export async function readSettings(actor: Actor | null) {
  requireAction(actor, 'settings.read');
  const rows = await all('siteSettings');
  return Object.fromEntries(rows.map((row) => [String(row.key || row.id), String(row.value ?? '')]));
}

export async function saveMeasurementId(actor: Actor | null, measurementId: string) {
  const user = requireAction(actor, 'settings.write');
  const value = measurementId.trim();
  if (value && !/^G-[A-Z0-9]+$/i.test(value)) throw new Error('Enter a GA4 measurement ID like G-XXXX, or leave it blank.');
  const before = await one('siteSettings', 'ga_measurement_id');
  await put('siteSettings', 'ga_measurement_id', { id: 'ga_measurement_id', key: 'ga_measurement_id', value });
  await writeAudit(user, 'settings.analytics', 'settings', 'ga_measurement_id', before ? { value: before.value } : null, { configured: Boolean(value) });
}

export async function diagnostics(actor: Actor | null) {
  requireAction(actor, 'diagnostics.read');
  const [users, events, inquiries] = await Promise.all([all('adminUsers'), all('analyticsEvents'), all('cateringInquiries')]);
  return {
    users: users.length,
    events: events.length,
    gaSecretConfigured: Boolean(process.env.GA4_API_SECRET),
    node: process.version,
    readiness: readinessReport(),
    failedNotifications: inquiries.filter((row) => row.notification_status === 'failed').length,
    firebase: usingFirebaseEmulator() ? 'emulator' : 'remote',
  };
}

export async function recordAnalytics(input: {
  name: string;
  path: string;
  metadata: Record<string, string>;
  device: string;
  referrerHost: string;
  eventKey?: string;
}) {
  const metadata = Object.fromEntries(Object.entries(input.metadata).filter(([, value]) => !value.includes('@')));
  const id = randomUUID();
  let stored = true;
  await db().runTransaction(async (tx) => {
    if (input.eventKey) {
      const key = db().collection('analyticsKeys').doc(input.eventKey);
      const existing = await tx.get(key);
      if (existing.exists) {
        stored = false;
        return;
      }
      tx.set(key, { event_id: id, created_at: now() });
    }
    tx.set(db().collection('analyticsEvents').doc(id), {
      id,
      name: input.name,
      path: input.path.slice(0, 200),
      metadata_json: JSON.stringify(metadata),
      device: input.device,
      referrer_host: input.referrerHost.slice(0, 120),
      created_at: now(),
      event_key: input.eventKey || null,
    });
  });
  return stored;
}

export async function recordStoredImage(actor: Actor | null, image: { path: string; provider: string; contentType: string; byteSize: number }) {
  const user = requireAction(actor, 'menu.write');
  const id = randomUUID();
  await put('storedImages', id, {
    id,
    path: image.path,
    provider: image.provider,
    content_type: image.contentType,
    byte_size: image.byteSize,
    created_at: now(),
  });
  await writeAudit(user, 'image.upload', 'image', id, null, { path: image.path, provider: image.provider, byteSize: image.byteSize });
  return id;
}

export async function notificationSummary(actor: Actor | null) {
  requireAction(actor, 'catering.read');
  const counts: Record<string, number> = {};
  for (const row of await all('cateringInquiries')) {
    const key = String(row.notification_status || 'pending');
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function analyticsReport(actor: Actor | null, from: string, to: string) {
  requireAction(actor, 'analytics.read');
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) throw new Error('Choose a valid date range.');
  const span = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - span);
  const events = await all('analyticsEvents');
  const rows = events.filter((row) => String(row.created_at) >= start.toISOString() && String(row.created_at) <= end.toISOString()) as {
    name: string;
    path: string;
    metadata_json: string;
    device: string;
    referrer_host: string;
    created_at: string;
  }[];
  const previousTotal = events.filter((row) => String(row.created_at) >= previousStart.toISOString() && String(row.created_at) <= previousEnd.toISOString()).length;
  const count = (name: string) => rows.filter((row) => row.name === name).length;
  const by = (pick: (row: (typeof rows)[number]) => string) => {
    const totals = new Map<string, number>();
    for (const row of rows) totals.set(pick(row) || 'Unknown', (totals.get(pick(row) || 'Unknown') || 0) + 1);
    return [...totals.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
  };
  return {
    from,
    to,
    total: rows.length,
    previousTotal,
    menuViews: count('menu_view'),
    pageViews: count('page_view'),
    itemViews: count('menu_item_view'),
    daily: dailyEventCounts(rows, from, to),
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

function publishedRows(rows: Record<string, unknown>[], preview: boolean) {
  return rows.filter((row) => row.status === 'published' || (preview && row.status === 'draft'));
}

export async function publishedMenu(preview = false) {
  const stored = await all('menuCategories');
  if (!stored.length) return null;
  const categories = sortBy(publishedRows(stored, preview), ['sort_order', 'name']);
  const items = sortBy(publishedRows(await all('menuItems'), preview), ['sort_order', 'name']);
  return categories.map((category) => ({
    id: String(category.id),
    name: String(category.name),
    description: String(category.description),
    image: String(category.image),
    imageAlt: String(category.image_alt),
    imagePosition: category.image_position ? String(category.image_position) : undefined,
    items: items
      .filter((item) => item.category_id === category.id)
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

export async function publishedSite() {
  const row = await one('siteContent', 'website');
  return parseContent(row?.published_json);
}

export async function publishedStops(today = new Date().toISOString()) {
  const cutoff = today.slice(0, 16);
  return sortBy(await all('truckStops'), ['starts_at']).filter((stop) => stop.status === 'published' && Number(stop.visible) === 1 && String(stop.ends_at) >= cutoff);
}

export async function activePromotions(today = new Date().toISOString().slice(0, 10)) {
  return sortBy(await all('promotions'), ['updated_at'], 'desc').filter((promo) => {
    if (promo.status !== 'published' || Number(promo.active) !== 1) return false;
    if (promo.starts_at && String(promo.starts_at) > today) return false;
    if (promo.ends_at && String(promo.ends_at) < today) return false;
    return true;
  });
}

export async function publishedPackages() {
  return sortBy(
    (await all('cateringPackages')).filter((row) => row.status === 'published'),
    ['sort_order', 'name'],
  );
}

export async function publicEmail() {
  return (await publishedSite())?.email || contact.email;
}

export async function measurementId() {
  const row = await one('siteSettings', 'ga_measurement_id');
  return String(row?.value || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '');
}

export async function ensureAuthUser(input: { id: string; email: string; name: string; password: string; role: Role; disabled?: number }) {
  const existing = await one('adminUsers', input.id);
  if (!existing) {
    await put('adminUsers', input.id, {
      id: input.id,
      email: input.email,
      name: input.name,
      role: input.role,
      disabled: input.disabled || 0,
      created_at: now(),
    });
  }
  try {
    await adminAuth().getUser(input.id);
    await adminAuth().setCustomUserClaims(input.id, { role: input.role });
  } catch {
    await adminAuth().createUser({
      uid: input.id,
      email: input.email,
      password: input.password,
      displayName: input.name,
      disabled: Boolean(input.disabled),
    });
    await adminAuth().setCustomUserClaims(input.id, { role: input.role });
  }
}
