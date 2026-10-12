import ActivityTimeline from '@/components/admin/ActivityTimeline';
import { currentUser } from '@/lib/admin/current-user';
import { listAudit, listUsers } from '@/lib/admin/gateway';
import type { AuditRow } from '@/lib/admin/activity-view';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const user = await currentUser();
  const logs = ((await listAudit(user)) as AuditRow[]).map((log) => ({
    id: String(log.id),
    created_at: String(log.created_at),
    role: String(log.role),
    action: String(log.action),
    entity_type: String(log.entity_type),
    entity_id: String(log.entity_id),
    user_id: String(log.user_id),
    before_json: log.before_json == null ? null : String(log.before_json),
    after_json: log.after_json == null ? null : String(log.after_json),
  }));
  const names: Record<string, string> = {};
  if (user?.role === 'NOCTARIS_ADMIN') {
    const accounts = (await listUsers(user)) as { id: string; name: string }[];
    for (const account of accounts) names[account.id] = account.name;
  }
  return <ActivityTimeline logs={logs} names={names} ownerView={user?.role !== 'NOCTARIS_ADMIN'} />;
}
