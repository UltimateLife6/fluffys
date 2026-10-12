import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { closeDatabase, databasePath } from '@/lib/admin/db';
import { seedCatalog, seedUser } from '@/lib/admin/service';

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed the admin database while NODE_ENV=production.');
  process.exit(1);
}

const required = ['ADMIN_SESSION_SECRET', 'NOCTARIS_ADMIN_EMAIL', 'NOCTARIS_ADMIN_PASSWORD', 'OWNER_EMAIL', 'OWNER_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if ((process.env.ADMIN_SESSION_SECRET || '').length < 16) {
  console.error('ADMIN_SESSION_SECRET must be at least 16 characters.');
  process.exit(1);
}

if (process.argv.includes('--reset')) {
  closeDatabase();
  const file = databasePath();
  if (file !== ':memory:' && existsSync(file)) rmSync(file);
  console.log('Removed the local admin database.');
}

seedCatalog();
seedUser({
  email: process.env.NOCTARIS_ADMIN_EMAIL || '',
  name: process.env.NOCTARIS_ADMIN_NAME || 'Noctaris Admin',
  password: process.env.NOCTARIS_ADMIN_PASSWORD || '',
  role: 'NOCTARIS_ADMIN',
});
seedUser({
  email: process.env.OWNER_EMAIL || '',
  name: process.env.OWNER_NAME || 'Restaurant Owner',
  password: process.env.OWNER_PASSWORD || '',
  role: 'OWNER',
});
closeDatabase();
console.log('Local admin database is ready. No production data was changed.');
