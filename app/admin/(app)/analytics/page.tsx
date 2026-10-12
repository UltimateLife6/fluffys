import { currentUser } from '@/lib/admin/current-user';
import { analyticsReport } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

function Bars({ rows }: { rows: { label: string; total: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  if (!rows.length) return <p className="admin-muted">No data in this range.</p>;
  return (
    <div>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track" aria-hidden="true"><span style={{ width: `${(row.total / max) * 100}%` }} /></div>
          <strong>{row.total}</strong>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; error?: string }> }) {
  const params = await searchParams;
  const to = params.to || new Date().toISOString().slice(0, 10);
  const from = params.from || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  let report: Awaited<ReturnType<typeof analyticsReport>> | null = null;
  let error = params.error;
  try {
    report = await analyticsReport(await currentUser(), from, to);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Could not load analytics.';
  }
  return (
    <>
      <h1>Analytics</h1>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <form className="admin-card admin-form two" method="get">
        <label>From<input type="date" name="from" defaultValue={from} /></label>
        <label>To<input type="date" name="to" defaultValue={to} /></label>
        <button className="button primary" type="submit">Update range</button>
      </form>
      {report ? (
        <>
          <p className="admin-muted">These counts are events stored by this website. They are not Google Analytics reports, and an ordering-link click is not a completed sale. Empty ranges stay at zero.</p>
          <div className="admin-grid stats">
            <article className="admin-card admin-stat"><span>Events</span><strong>{report.total}</strong><small>Previous period: {report.previousTotal}</small></article>
            <article className="admin-card admin-stat"><span>Menu views</span><strong>{report.menuViews}</strong></article>
            <article className="admin-card admin-stat"><span>Phone clicks</span><strong>{report.phoneClicks}</strong></article>
            <article className="admin-card admin-stat"><span>Catering leads</span><strong>{report.inquiries}</strong></article>
          </div>
          <section className="admin-card"><h2>Ordering providers</h2><Bars rows={report.providers} /></section>
          <section className="admin-card"><h2>Devices</h2><Bars rows={report.devices} /></section>
          <section className="admin-card"><h2>Traffic sources</h2><Bars rows={report.sources} /></section>
          <section className="admin-card"><h2>Pages</h2><Bars rows={report.pages.slice(0, 8)} /></section>
          <section className="admin-card"><h2>Menu categories viewed</h2><Bars rows={report.items} /></section>
        </>
      ) : null}
    </>
  );
}
