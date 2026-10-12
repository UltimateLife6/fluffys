import { redirect } from 'next/navigation';
import { saveSettingsAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { currentUser } from '@/lib/admin/current-user';
import { diagnostics, readSettings } from '@/lib/admin/gateway';
import { sessionPolicy } from '@/lib/admin/security';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user?.role !== 'NOCTARIS_ADMIN') redirect('/admin?denied=1');
  const params = await searchParams;
  const settings = await readSettings(user);
  const info = await diagnostics(user);
  return (
    <>
      <h1>Settings</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <form className="admin-card admin-form" action={saveSettingsAction}>
        <label>GA4 measurement ID
          <input name="measurementId" defaultValue={settings.ga_measurement_id || ''} placeholder="G-XXXX" />
        </label>
        <p className="admin-muted">The measurement ID can be stored here. The GA4 API secret stays in the server environment and is never shown.</p>
        <SubmitButton>Save settings</SubmitButton>
      </form>
      <section className="admin-card">
        <h2>Diagnostics</h2>
        <ul>
          <li>Accounts: {info.users}</li>
          <li>Recorded events: {info.events}</li>
          <li>GA4 API secret configured: {info.gaSecretConfigured ? 'Yes' : 'No'}</li>
          <li>Node.js: {info.node}</li>
          <li>Failed email notices: {info.failedNotifications}</li>
        </ul>
      </section>
      <section className="admin-card">
        <h2>Production readiness</h2>
        <ul>
          <li>Database: {info.readiness.database}</li>
          <li>Image storage: {info.readiness.storage}</li>
          <li>Catering email: {info.readiness.email}</li>
          <li>GA4 measurement ID: {info.readiness.gaMeasurementConfigured ? 'Configured' : 'Not configured'}</li>
          <li>GA4 API secret: {info.readiness.gaSecretConfigured ? 'Configured' : 'Not configured'}</li>
          <li>Session secret: {info.readiness.sessionSecretConfigured ? 'Configured' : 'Missing'}</li>
          <li>Sessions last {sessionPolicy.absoluteHours} hours and end after {sessionPolicy.idleHours} idle hours.</li>
        </ul>
        <p className="admin-muted">These checks describe this server. They do not mean a production database or email account is connected.</p>
      </section>
    </>
  );
}
