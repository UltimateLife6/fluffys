'use client';

import { useMemo, useState } from 'react';
import { AdminEmptyState, AdminFilterBar, AdminPageHeader, AdminSearchInput } from '@/components/admin/ui';
import { changeSummary, filterActivity, type AuditRow } from '@/lib/admin/activity-view';

export default function ActivityTimeline({ logs, names, ownerView }: { logs: AuditRow[]; names: Record<string, string>; ownerView: boolean }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const actions = [...new Set(logs.map((log) => log.action))].sort();
  const users = [...new Set(logs.map((log) => log.user_id))];
  const visible = useMemo(() => filterActivity(logs, { query, action, user, from, to }), [logs, query, action, user, from, to]);

  return (
    <>
      <AdminPageHeader
        title="Activity log"
        description={ownerView ? 'This log is read-only. Account and settings changes are hidden from owners.' : 'This log is read-only and includes account and settings changes.'}
      />
      <section className="admin-card">
        <AdminFilterBar>
          <AdminSearchInput label="Search activity" placeholder="Search actions" value={query} onChange={setQuery} />
          <label>Action
            <select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">All actions</option>
              {actions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {ownerView ? null : (
            <label>User
              <select value={user} onChange={(event) => setUser(event.target.value)}>
                <option value="">Everyone</option>
                {users.map((id) => <option key={id} value={id}>{names[id] || id.slice(0, 8)}</option>)}
              </select>
            </label>
          )}
          <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </AdminFilterBar>
        {visible.length === 0 ? <AdminEmptyState title="No matching activity">Records appear after someone changes the menu, stops, inquiries, or site content.</AdminEmptyState> : (
          <ol className="admin-timeline">
            {visible.map((log) => (
              <li key={log.id}>
                <time dateTime={log.created_at}>{log.created_at.replace('T', ' ').slice(0, 16)}</time>
                <div>
                  <strong>{names[log.user_id] || log.role.replaceAll('_', ' ')}</strong>
                  <span>{log.action}</span>
                  <small>{log.entity_type} · {log.entity_id}</small>
                  <p>{changeSummary(log.before_json, log.after_json)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
