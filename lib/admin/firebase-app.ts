import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const processState = globalThis as typeof globalThis & { __fluffysFirestoreConfigured?: boolean };

export function firebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'fluffys-local';
}

export function usingFirebaseEmulator() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export function assertFirebaseAllowed() {
  if (usingFirebaseEmulator()) {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('FIREBASE_AUTH_EMULATOR_HOST is required with the Firestore emulator.');
    const host = process.env.FIRESTORE_EMULATOR_HOST || '';
    const name = host.split(':')[0];
    if (!['127.0.0.1', 'localhost', '::1'].includes(name)) throw new Error('Refusing a non-local Firestore emulator host.');
    return;
  }
  if (process.env.FIREBASE_ALLOW_REMOTE !== '1') {
    throw new Error('Refusing remote Firebase. Start the local emulators, or set FIREBASE_ALLOW_REMOTE=1 for a reviewed project.');
  }
}

export function firebaseApp(): App {
  assertFirebaseAllowed();
  if (getApps().length) return getApps()[0];
  const projectId = firebaseProjectId();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  if (usingFirebaseEmulator()) return initializeApp({ projectId, storageBucket });
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) throw new Error('Firebase service account is not configured.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId, storageBucket });
}

export function firestore(): Firestore {
  const database = getFirestore(firebaseApp());
  if (processState.__fluffysFirestoreConfigured) return database;
  try {
    database.settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('already been initialized')) throw error;
  }
  processState.__fluffysFirestoreConfigured = true;
  return database;
}

export function adminAuth() {
  return getAuth(firebaseApp());
}

export function storageBucket() {
  return getStorage(firebaseApp()).bucket(process.env.FIREBASE_STORAGE_BUCKET || `${firebaseProjectId()}.appspot.com`);
}
