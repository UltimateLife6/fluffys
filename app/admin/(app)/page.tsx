import Link from 'next/link';
import { currentUser } from '@/lib/admin/current-user';
import { analyticsReport, listInquiries, listCategories, notificationSummary } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const denied = (await searchParams).denied;
  const user = await currentUser();
  const categories = await listCategories(user, true);
  const items = categories.flatMap((category) => category.items as { status: string }[]);
  const inquiries = (await listInquiries(user)) as { status: string }[];
  const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const report = await analyticsReport(user, from, todayISO());
  const notices = await notificationSummary(user);
  const waitingNotices = Number(notices.pending || 0) + Number(notices.failed || 0);
  return (
    <>
      <h1>Overview</h1>
      {denied ? <p className="admin-error" role="alert">That area is limited to Noctaris administrators.</p> : null}
      <div className="admin-grid stats">
        <article className="admin-card admin-stat">
          <span>Published dishes</span>
          <strong>{items.filter((item) => item.status === 'published').length}</strong>
        </article>
        <article className="admin-card admin-stat">
          <span>Drafts</span>
          <strong>{items.filter((item) => item.status === 'draft').length}</strong>
        </article>
        <article className="admin-card admin-stat">
          <span>Open inquiries</span>
          <strong>{inquiries.filter((item) => item.status !== 'closed').length}</strong>
        </article>
        <article className="admin-card admin-stat">
          <span>Events, last 7 days</span>
          <strong>{report.total}</strong>
        </article>
      </div>
      <section className="admin-card">
        <h2>What you can do</h2>
        <p>Published menu changes appear on the public menu. Drafts stay private until you publish them.</p>
        <div className="admin-actions">
          <Link className="button primary" href="/admin/menu">
            Edit the menu
          </Link>
          <Link className="button secondary" href="/menu?preview=1">
            Preview drafts
          </Link>
        </div>
        {report.total === 0 ? <p className="admin-muted">No visitor activity has been recorded yet. Analytics stay empty until real visits are tracked.</p> : null}
        {waitingNotices > 0 ? <p>{waitingNotices} catering {waitingNotices === 1 ? 'request is' : 'requests are'} saved and still waiting on an email notice.</p> : null}
      </section>
    </>
  );
}
