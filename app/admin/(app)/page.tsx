import Link from 'next/link';
import { currentUser } from '@/lib/admin/current-user';
import { analyticsReport, listAudit, listInquiries, listCategories, notificationSummary } from '@/lib/admin/gateway';
import { AdminEmptyState, AdminPageHeader, AdminStatCard, EventChart, MetricBars } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const denied = (await searchParams).denied;
  const user = await currentUser();
  const categories = await listCategories(user, true);
  const items = categories.flatMap((category) => category.items as { status: string; available: number }[]);
  const inquiries = (await listInquiries(user)) as { id: string; name: string; event_date: string; status: string; created_at: string }[];
  const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const report = await analyticsReport(user, from, todayISO());
  const notices = await notificationSummary(user);
  const logs = (await listAudit(user)) as { id: string; action: string; entity_type: string; created_at: string }[];
  const waitingNotices = Number(notices.pending || 0) + Number(notices.failed || 0);
  const published = items.filter((item) => item.status === 'published');
  const unavailable = published.filter((item) => !item.available).length;
  const openInquiries = inquiries.filter((item) => item.status !== 'closed').length;

  return (
    <>
      <AdminPageHeader title="Overview" description="A snapshot of the website and the work waiting in the dashboard. Counts come from saved records, not estimates." />
      {denied ? <p className="admin-error" role="alert">That area is limited to Noctaris administrators.</p> : null}
      <div className="admin-stats">
        <AdminStatCard label="Website visits" value="Not tracked" hint="This site records menu views and clicks, not a separate visit count." />
        <AdminStatCard label="Menu views" value={report.menuViews} hint="Last 7 days" />
        <AdminStatCard label="Ordering-link clicks" value={report.orderClicks} hint="Clicks are not sales" />
        <AdminStatCard label="Catering inquiries" value={openInquiries} hint="Open requests saved on this site" />
        <AdminStatCard label="Published menu items" value={published.length} />
        <AdminStatCard label="Unavailable dishes" value={unavailable} hint="Published dishes marked unavailable" />
      </div>
      <div className="admin-split">
        <section className="admin-card">
          <h2>Website activity</h2>
          <p className="admin-muted">Each bar is a recorded event, such as a menu view or a click. It is not a visit or a sale.</p>
          <EventChart rows={report.daily} label="Recorded website events for the last 7 days" />
        </section>
        <section className="admin-card">
          <h2>Ordering clicks</h2>
          <MetricBars rows={report.providers} empty="No ordering-link clicks in the last 7 days." />
        </section>
      </div>
      <div className="admin-split">
        <section className="admin-card">
          <h2>Popular menu categories</h2>
          {report.items.length === 0 ? <AdminEmptyState title="No category views yet">Category interest appears when visitors open dishes on the menu.</AdminEmptyState> : <MetricBars rows={report.items.slice(0, 5)} empty="" />}
        </section>
        <section className="admin-card">
          <h2>Recent catering inquiries</h2>
          {inquiries.length === 0 ? <AdminEmptyState title="No inquiries yet" /> : (
            <ul className="admin-compact">
              {inquiries.slice(0, 4).map((inquiry) => (
                <li key={inquiry.id}><strong>{inquiry.name}</strong><span>{inquiry.event_date} · {inquiry.status.replaceAll('_', ' ')}</span></li>
              ))}
            </ul>
          )}
          {waitingNotices > 0 ? <p>{waitingNotices} saved {waitingNotices === 1 ? 'request is' : 'requests are'} still waiting on an email notice.</p> : null}
        </section>
      </div>
      <div className="admin-split">
        <section className="admin-card">
          <h2>Recent activity</h2>
          {logs.length === 0 ? <AdminEmptyState title="No administrative changes yet" /> : (
            <ul className="admin-compact">
              {logs.slice(0, 5).map((log) => (
                <li key={log.id}><strong>{log.action}</strong><span>{log.entity_type} · {log.created_at.replace('T', ' ').slice(0, 16)}</span></li>
              ))}
            </ul>
          )}
        </section>
        <section className="admin-card">
          <h2>Quick actions</h2>
          <div className="admin-actions">
            <Link className="button primary" href="/admin/menu?compose=item">Add menu item</Link>
            <Link className="button secondary" href="/admin/locations?compose=stop">Update truck location</Link>
            <Link className="button secondary" href="/admin/promotions?compose=promo">Create promotion</Link>
            <Link className="button secondary" href="/admin/catering">View catering inquiries</Link>
            <Link className="button secondary" href="/menu?preview=1">Preview drafts</Link>
          </div>
        </section>
      </div>
    </>
  );
}
