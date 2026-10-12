import { mailProvider } from '@/lib/admin/mail';
import { storageProvider } from '@/lib/admin/storage';
import { databaseExists } from '@/lib/admin/db';

export function readinessReport() {
  const firebaseMode = process.env.DATA_BACKEND === 'firebase';
  return {
    database: firebaseMode ? (process.env.FIRESTORE_EMULATOR_HOST ? 'firestore-emulator' : 'firestore') : databaseExists() ? 'sqlite' : 'sqlite-missing',
    storage: storageProvider(),
    email: mailProvider(),
    gaMeasurementConfigured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    gaSecretConfigured: Boolean(process.env.GA4_API_SECRET),
    sessionSecretConfigured: (process.env.ADMIN_SESSION_SECRET || '').length >= 16,
  };
}

export function publicHealth() {
  let database: 'up' | 'down' = 'down';
  try {
    database = databaseExists() ? 'up' : 'down';
  } catch {
    database = 'down';
  }
  const report = readinessReport();
  return {
    ok: database === 'up',
    checks: {
      database,
      storage: report.storage,
      email: report.email === 'unconfigured' ? 'not_configured' : 'configured',
      analytics: report.gaSecretConfigured && report.gaMeasurementConfigured ? 'ga4_configured' : 'local_only',
    },
  };
}
