import { redirect } from 'next/navigation';
import { saveSettingsAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { AdminPageHeader, AdminStatusBadge } from '@/components/admin/ui';
import { currentUser } from '@/lib/admin/current-user';
import { diagnostics, readSettings } from '@/lib/admin/gateway';
import { sessionPolicy } from '@/lib/admin/security';

export const dynamic = 'force-dynamic';

function toneFor(kind: 'ok' | 'warn' | 'bad') {
  if (kind === 'ok') return 'active';
  if (kind === 'warn') return 'pending';
  return 'failed';
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user?.role !== 'NOCTARIS_ADMIN') redirect('/admin?denied=1');
  const params = await searchParams;
  const settings = await readSettings(user);
  const info = await diagnostics(user);
  const database = info.readiness.database;
  const databaseKind = database === 'sqlite-missing' ? 'bad' : 'ok';
  const firebaseKind = database.startsWith('firestore') ? 'ok' : 'warn';
  const emailKind = info.readiness.email === 'unconfigured' ? 'warn' : 'ok';
  const analyticsKind = info.readiness.gaMeasurementConfigured && info.readiness.gaSecretConfigured ? 'ok' : 'warn';
  return (
    <>
      <AdminPageHeader title="Settings" description="Integration status for this server. Secret values are never shown." />
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <section className="admin-card">
        <h2>Health checks</h2>
        <ul className="admin-health">
          <li><span>Database</span><AdminStatusBadge status={toneFor(databaseKind)}>{database}</AdminStatusBadge></li>
          <li><span>Firebase</span><AdminStatusBadge status={toneFor(firebaseKind)}>{database.startsWith('firestore') ? database : 'Not selected'}</AdminStatusBadge></li>
          <li><span>Image storage</span><AdminStatusBadge status="active">{info.readiness.storage}</AdminStatusBadge></li>
          <li><span>Email provider</span><AdminStatusBadge status={toneFor(emailKind)}>{info.readiness.email}</AdminStatusBadge></li>
          <li><span>Analytics</span><AdminStatusBadge status={toneFor(analyticsKind)}>{analyticsKind === 'ok' ? 'GA4 configured' : 'Local events only'}</AdminStatusBadge></li>
          <li><span>Session secret</span><AdminStatusBadge status={toneFor(info.readiness.sessionSecretConfigured ? 'ok' : 'bad')}>{info.readiness.sessionSecretConfigured ? 'Configured' : 'Missing'}</AdminStatusBadge></li>
        </ul>
        <p className="admin-muted">Configured means the server has the setting it needs. It does not mean a production project was contacted from this page.</p>
      </section>
      <section className="admin-card">
        <h2>Environment</h2>
        <ul className="admin-health">
          <li><span>Node.js</span><strong>{info.node}</strong></li>
          <li><span>Accounts</span><strong>{info.users}</strong></li>
          <li><span>Recorded events</span><strong>{info.events}</strong></li>
          <li><span>Failed email notices</span><strong>{info.failedNotifications}</strong></li>
          <li><span>Sessions</span><strong>{sessionPolicy.absoluteHours} hours, or {sessionPolicy.idleHours} idle hours</strong></li>
        </ul>
      </section>
      <form className="admin-card admin-form" action={saveSettingsAction}>
        <h2>Analytics measurement ID</h2>
        <label>GA4 measurement ID
          <input name="measurementId" defaultValue={settings.ga_measurement_id || ''} placeholder="G-XXXX" />
        </label>
        <p className="admin-muted">The measurement ID can be stored here. The GA4 API secret stays in the server environment and is never shown. Status: {info.gaSecretConfigured ? 'secret is set' : 'secret is not set'}.</p>
        <SubmitButton>Save settings</SubmitButton>
      </form>
    </>
  );
}
