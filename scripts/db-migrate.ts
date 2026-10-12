import { applySqliteMigrations, assertLocalMigrationTarget } from '@/lib/admin/migrate';

assertLocalMigrationTarget();
const versions = applySqliteMigrations();
console.log(`Local SQLite migrations are current through version ${versions.at(-1)?.version ?? 0}. No remote database was changed.`);
