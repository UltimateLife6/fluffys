import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { databasePath, openDatabase } from '@/lib/admin/db';

const tables = [
  'users',
  'sessions',
  'categories',
  'menu_items',
  'truck_stops',
  'catering_packages',
  'catering_inquiries',
  'promotions',
  'site_documents',
  'audit_logs',
  'analytics_events',
];

export function tableCounts() {
  const database = openDatabase();
  return Object.fromEntries(
    tables.map((table) => {
      const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
      return [table, row.count];
    }),
  );
}

export function integrityReport() {
  const database = openDatabase();
  const orphanItems = database
    .prepare('SELECT COUNT(*) AS count FROM menu_items WHERE category_id NOT IN (SELECT id FROM categories)')
    .get() as { count: number };
  const roles = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role NOT IN ('OWNER', 'NOCTARIS_ADMIN')").get() as {
    count: number;
  };
  return {
    counts: tableCounts(),
    orphanMenuItems: orphanItems.count,
    invalidRoles: roles.count,
    ok: orphanItems.count === 0 && roles.count === 0,
  };
}

export function backupSqlite() {
  const source = databasePath();
  if (source === ':memory:' || !existsSync(source)) throw new Error('There is no local SQLite file to back up.');
  const directory = path.join(process.cwd(), 'data', 'backups');
  mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(directory, `fluffys-admin-${stamp}.sqlite`);
  copyFileSync(source, destination);
  return { destination, counts: tableCounts() };
}
