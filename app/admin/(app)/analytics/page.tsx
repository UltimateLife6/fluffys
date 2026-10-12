import { currentUser } from '@/lib/admin/current-user';
import { analyticsReport } from '@/lib/admin/gateway';
import { AdminPageHeader, AdminStatCard, EventChart, MetricBars } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

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
      <AdminPageHeader title="Analytics" description="These counts are events stored by this website. They are not Google Analytics, and an ordering-link click is not a completed sale." />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <form className="admin-card admin-filters" method="get">
        <label>From<input type="date" name="from" defaultValue={from} /></label>
        <label>To<input type="date" name="to" defaultValue={to} /></label>
        <button className="button primary" type="submit">Update range</button>
      </form>
      <p className="admin-note">Google Analytics 4 is not shown on this page. If it is not configured, traffic-source and device charts below use only events saved locally. Missing numbers stay empty. They are not estimated.</p>
      {report ? (
        <>
          <div className="admin-stats">
            <AdminStatCard label="Recorded events" value={report.total} hint={`Previous period: ${report.previousTotal}`} />
            <AdminStatCard label="Menu views" value={report.menuViews} />
            <AdminStatCard label="Menu item views" value={report.itemViews} />
            <AdminStatCard label="Ordering clicks" value={report.orderClicks} hint="Not sales" />
            <AdminStatCard label="Catering form submits" value={report.inquiries} hint="Saved inquiries, not bookings" />
            <AdminStatCard label="Phone clicks" value={report.phoneClicks} />
          </div>
          <section className="admin-card">
            <h2>Website traffic</h2>
            <EventChart rows={report.daily} label="Recorded events by day" />
          </section>
          <div className="admin-split">
            <section className="admin-card"><h2>Ordering providers</h2><MetricBars rows={report.providers} empty="No ordering-link clicks in this range." /></section>
            <section className="admin-card"><h2>Top menu categories</h2><MetricBars rows={report.items.slice(0, 8)} empty="No menu-item views in this range." /></section>
          </div>
          <div className="admin-split">
            <section className="admin-card"><h2>Traffic sources</h2><MetricBars rows={report.sources} empty="No source data in this range." /></section>
            <section className="admin-card"><h2>Devices</h2><MetricBars rows={report.devices} empty="No device data in this range." /></section>
          </div>
          <section className="admin-card"><h2>Pages</h2><MetricBars rows={report.pages.slice(0, 8)} empty="No page events in this range." /></section>
        </>
      ) : null}
    </>
  );
}
