import { databaseExists, openDatabase } from '@/lib/admin/db';
import { readinessReport } from '@/lib/admin/readiness';

export async function GET() {
  let database: 'up' | 'down' = 'down';
  try {
    if (process.env.DATA_BACKEND === 'firebase') {
      const { pingFirestore } = await import('@/lib/admin/firebase-service');
      await pingFirestore();
      database = 'up';
    } else if (databaseExists()) {
      openDatabase().prepare('SELECT 1 AS ok').get();
      database = 'up';
    }
  } catch {
    database = 'down';
  }
  const report = readinessReport();
  return Response.json(
    {
      ok: database === 'up',
      checks: {
        database,
        storage: report.storage,
        email: report.email === 'unconfigured' ? 'not_configured' : 'configured',
        analytics: report.gaSecretConfigured && report.gaMeasurementConfigured ? 'ga4_configured' : 'local_only',
      },
    },
    { status: database === 'up' ? 200 : 503 },
  );
}
