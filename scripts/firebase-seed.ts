import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ensureAuthUser } from '@/lib/admin/firebase-service';

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

if (process.env.NODE_ENV === 'production' && !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to seed Firebase outside the local emulators.');
}
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Start the Firebase emulators before seeding accounts.');
}

const accounts = [
  {
    id: 'noctaris-local',
    email: process.env.NOCTARIS_ADMIN_EMAIL || '',
    name: process.env.NOCTARIS_ADMIN_NAME || 'Noctaris Admin',
    password: process.env.NOCTARIS_ADMIN_PASSWORD || '',
    role: 'NOCTARIS_ADMIN' as const,
  },
  {
    id: 'owner-local',
    email: process.env.OWNER_EMAIL || '',
    name: process.env.OWNER_NAME || "Fluffy's Owner",
    password: process.env.OWNER_PASSWORD || '',
    role: 'OWNER' as const,
  },
].filter((account) => account.email && account.password.length >= 10);

if (!accounts.length) throw new Error('Local account passwords are not configured.');

for (const account of accounts) {
  await ensureAuthUser(account);
  console.log(`Seeded ${account.role} ${account.email}`);
}
