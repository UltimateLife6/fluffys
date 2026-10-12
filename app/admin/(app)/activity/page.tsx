import { currentUser } from '@/lib/admin/current-user';
import { listAudit } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const logs = (await listAudit(await currentUser())) as {
    id: string;
    created_at: string;
    role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id: string;
    before_json: string | null;
    after_json: string | null;
  }[];
  return (
    <>
      <h1>Activity log</h1>
      <p className="admin-muted">Records are read-only. Owners do not see account or settings changes. Noctaris admins see the full log.</p>
      {logs.length === 0 ? <p className="admin-card">No administrative changes have been recorded yet.</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>When</th><th>Action</th><th>Record</th><th>Role</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.created_at.replace('T', ' ').slice(0, 19)}</td>
                <td>{log.action}</td>
                <td>{log.entity_type}<br /><span className="admin-muted">{log.entity_id}</span></td>
                <td>{log.role}</td>
                <td>
                  <details>
                    <summary>Changes</summary>
                    <pre>{JSON.stringify({ before: log.before_json, after: log.after_json }, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
