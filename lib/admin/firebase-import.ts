import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { openDatabase } from '@/lib/admin/db';
import { applySqliteMigrations } from '@/lib/admin/migrate';

const tableMap = {
  users: 'adminUsers',
  categories: 'menuCategories',
  menu_items: 'menuItems',
  truck_stops: 'truckStops',
  catering_packages: 'cateringPackages',
  catering_inquiries: 'cateringInquiries',
  promotions: 'promotions',
  site_documents: 'siteContent',
  site_revisions: 'siteRevisions',
  audit_logs: 'auditLogs',
  analytics_events: 'analyticsEvents',
  stored_images: 'storedImages',
} as const;

type TableName = keyof typeof tableMap;

function readTable(file: string | undefined, table: TableName) {
  const database = openDatabase(file);
  return database.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
}

function withoutSecrets(row: Record<string, unknown>) {
  const copy = { ...row };
  delete copy.password_hash;
  delete copy.token_hash;
  return copy;
}

function tally(rows: Record<string, unknown>[], field: string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row[field] ?? 'missing');
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function planSqliteImport(file?: string) {
  applySqliteMigrations(openDatabase(file));
  const collections: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  for (const [table, collection] of Object.entries(tableMap) as [TableName, string][]) {
    const rows = readTable(file, table).map(withoutSecrets);
    collections[collection] = rows.map((row) => ({ ...row, id: String(row.id) }));
    counts[collection] = rows.length;
  }
  const settings = readTable(file, 'users').length >= 0 ? (openDatabase(file).prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]) : [];
  collections.siteSettings = settings.map((row) => ({ id: row.key, key: row.key, value: row.value }));
  counts.siteSettings = settings.length;
  const categories = new Set(collections.menuCategories.map((row) => String(row.id)));
  const orphanMenuItems = collections.menuItems.filter((row) => !categories.has(String(row.category_id))).map((row) => String(row.id));
  const inquiryKeys = collections.cateringInquiries
    .filter((row) => row.dedupe_key)
    .map((row) => ({ id: String(row.dedupe_key), inquiry_id: String(row.id), created_at: row.created_at }));
  collections.inquiryKeys = inquiryKeys;
  counts.inquiryKeys = inquiryKeys.length;
  return {
    counts,
    statuses: {
      menuCategories: tally(collections.menuCategories, 'status'),
      menuItems: tally(collections.menuItems, 'status'),
      truckStops: tally(collections.truckStops, 'status'),
      cateringPackages: tally(collections.cateringPackages, 'status'),
      cateringInquiries: tally(collections.cateringInquiries, 'status'),
      promotions: tally(collections.promotions, 'status'),
    },
    orphanMenuItems,
    ok: orphanMenuItems.length === 0,
    executed: false,
    collections,
  };
}

export function exportPlan(file: string | undefined, destination: string) {
  const plan = planSqliteImport(file);
  mkdirSync(path.dirname(destination), { recursive: true });
  const payload = {
    counts: plan.counts,
    statuses: plan.statuses,
    orphanMenuItems: plan.orphanMenuItems,
    collections: plan.collections,
  };
  writeFileSync(destination, JSON.stringify(payload));
  return { destination, counts: plan.counts, ok: plan.ok };
}

function assertEmulatorTarget() {
  const host = process.env.FIRESTORE_EMULATOR_HOST || '';
  const name = host.split(':')[0];
  if (!host || !['127.0.0.1', 'localhost', '::1'].includes(name)) {
    throw new Error('Refusing to import unless FIRESTORE_EMULATOR_HOST points at localhost.');
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Refusing to import without the Auth emulator.');
}

export async function applySqliteImport(file?: string) {
  assertEmulatorTarget();
  const plan = planSqliteImport(file);
  if (!plan.ok) throw new Error('Import stopped because a menu item points at a missing category.');
  const { firestore } = await import('@/lib/admin/firebase-app');
  const database = firestore();
  let created = 0;
  let skipped = 0;
  for (const [collection, docs] of Object.entries(plan.collections)) {
    for (const doc of docs) {
      const ref = database.collection(collection).doc(String(doc.id));
      const existing = await ref.get();
      if (existing.exists) {
        skipped += 1;
        continue;
      }
      await ref.set(doc);
      created += 1;
    }
  }
  const importedCounts: Record<string, number> = {};
  for (const collection of Object.keys(plan.collections)) {
    importedCounts[collection] = (await database.collection(collection).get()).size;
  }
  return { created, skipped, source: plan.counts, imported: importedCounts, statuses: plan.statuses, ok: plan.ok };
}
