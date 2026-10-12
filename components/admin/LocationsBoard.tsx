'use client';

import { useEffect, useState } from 'react';
import { saveStopAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { AdminDrawer } from '@/components/admin/Drawer';
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from '@/components/admin/ui';

export type StopRow = {
  id: string;
  name: string;
  address: string;
  starts_at: string;
  ends_at: string;
  hours: string;
  status: string;
  visible: number;
};

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function LocationsBoard({ stops, error, startOpen = false }: { stops: StopRow[]; error?: string; startOpen?: boolean }) {
  const [view, setView] = useState<'upcoming' | 'draft' | 'past'>('upcoming');
  const [editing, setEditing] = useState<StopRow | null | undefined>(startOpen ? null : undefined);
  useEffect(() => {
    if (startOpen) setEditing(null);
  }, [startOpen]);
  const now = new Date().toISOString();
  const visible = stops.filter((stop) => {
    if (view === 'draft') return stop.status === 'draft';
    if (view === 'past') return stop.ends_at < now || stop.status === 'cancelled';
    return stop.status !== 'draft' && stop.status !== 'cancelled' && stop.ends_at >= now;
  });

  return (
    <>
      <AdminPageHeader
        title="Truck locations"
        description="Find Us stays on the coming-soon message until a stop is published and marked visible."
        action={<button className="button primary" type="button" onClick={() => setEditing(null)}>Add stop</button>}
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="admin-tabs" role="tablist" aria-label="Stop views">
        {(['upcoming', 'draft', 'past'] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <AdminEmptyState title={view === 'upcoming' ? 'No upcoming stops' : `No ${view} stops`}>Add a stop when Fluffy’s confirms a location. Do not invent one.</AdminEmptyState> : (
        <div className="admin-cards">
          {visible.map((stop) => (
            <article className="admin-card" key={stop.id}>
              <header>
                <h2>{stop.name}</h2>
                <AdminStatusBadge status={stop.status} />
              </header>
              <p>{stop.address}</p>
              <p>{when(stop.starts_at)} – {when(stop.ends_at)}</p>
              <p className="admin-muted">{stop.hours || 'No hours note'} · {stop.visible ? 'Visible on the website' : 'Hidden'}</p>
              <button className="button secondary" type="button" onClick={() => setEditing(stop)}>Edit</button>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined ? (
        <AdminDrawer title={editing ? editing.name : 'Add a stop'} description="Publish and mark it visible when it should appear on Find Us." onClose={() => setEditing(undefined)}>
          <form className="admin-form" action={saveStopAction}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <label>Location name<input name="name" required defaultValue={editing?.name || ''} /></label>
            <label>Address<input name="address" required defaultValue={editing?.address || ''} /></label>
            <label>Starts<input name="startsAt" type="datetime-local" required defaultValue={editing?.starts_at || ''} /></label>
            <label>Ends<input name="endsAt" type="datetime-local" required defaultValue={editing?.ends_at || ''} /></label>
            <label>Operating hours<input name="hours" defaultValue={editing?.hours || ''} /></label>
            <label>Publication status
              <select name="status" defaultValue={editing?.status || 'draft'}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="admin-switch"><input name="visible" type="checkbox" defaultChecked={Boolean(editing?.visible)} /> Visible on the website</label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setEditing(undefined)}>Cancel</button>
              <SubmitButton>Save stop</SubmitButton>
            </div>
          </form>
        </AdminDrawer>
      ) : null}
    </>
  );
}
