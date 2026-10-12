import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '@/lib/admin/db';

const columns: Record<string, { name: string; definition: string }[]> = {
  sessions: [{ name: 'last_seen_at', definition: 'TEXT' }],
  catering_inquiries: [
    { name: 'notification_status', definition: "TEXT NOT NULL DEFAULT 'not_configured'" },
    { name: 'notification_error', definition: "TEXT NOT NULL DEFAULT ''" },
    { name: 'notification_attempts', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'dedupe_key', definition: 'TEXT' },
  ],
  analytics_events: [{ name: 'event_key', definition: 'TEXT' }],
};

function columnNames(database: DatabaseSync, table: string) {
  return new Set(
    (database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((row) => row.name),
  );
}

export function applySqliteMigrations(database: DatabaseSync = openDatabase()) {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(
    (database.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((row) => row.version),
  );
  const stamp = new Date().toISOString();
  if (!applied.has(1)) {
    database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(stamp);
  }
  if (!applied.has(2)) {
    for (const [table, fields] of Object.entries(columns)) {
      const existing = columnNames(database, table);
      for (const field of fields) {
        if (!existing.has(field.name)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${field.name} ${field.definition}`);
      }
    }
    database.exec(`
      CREATE TABLE IF NOT EXISTS stored_images (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        content_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        bucket TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS catering_dedupe_key ON catering_inquiries (dedupe_key) WHERE dedupe_key IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS analytics_event_key ON analytics_events (event_key) WHERE event_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS analytics_created_at ON analytics_events (created_at);
      CREATE INDEX IF NOT EXISTS inquiries_created_at ON catering_inquiries (created_at);
      CREATE INDEX IF NOT EXISTS rate_limits_bucket ON rate_limits (bucket, created_at);
    `);
    database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)').run(stamp);
  }
  return database.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[];
}

export function assertLocalMigrationTarget() {
  if (process.env.DATABASE_URL) {
    throw new Error('Refusing to migrate while DATABASE_URL is set. Use the local SQLite file or the Firebase emulator import.');
  }
}
