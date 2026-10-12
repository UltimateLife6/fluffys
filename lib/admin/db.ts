import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databases = new Map<string, DatabaseSync>();

export function databasePath() {
  return process.env.ADMIN_DB_PATH || path.join(process.cwd(), 'data', 'fluffys-admin.sqlite');
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'NOCTARIS_ADMIN')),
  password_hash TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  image_alt TEXT NOT NULL,
  image_position TEXT,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  price_cents INTEGER,
  available INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS truck_stops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  hours TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'cancelled')),
  visible INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pricing_note TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  guests TEXT NOT NULL,
  location TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  internal_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_documents (
  id TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  published_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  device TEXT NOT NULL DEFAULT 'unknown',
  referrer_host TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`;

export function openDatabase(file = databasePath()) {
  const existing = databases.get(file);
  if (existing) return existing;
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  databases.set(file, db);
  return db;
}

export function databaseExists(file = databasePath()) {
  if (file === ':memory:') return databases.has(file);
  try {
    return databases.has(file) || existsSync(file);
  } catch {
    return false;
  }
}

export function closeDatabase(file = databasePath()) {
  const db = databases.get(file);
  if (!db) return;
  db.close();
  databases.delete(file);
}
