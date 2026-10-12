'use client';

import { useEffect, useState } from 'react';
import { savePromotionAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { AdminDrawer } from '@/components/admin/Drawer';
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from '@/components/admin/ui';

export type PromotionRow = {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: string;
  starts_at: string | null;
  ends_at: string | null;
  active: number;
  status: string;
};

function expired(item: PromotionRow) {
  return Boolean(item.ends_at && item.ends_at < new Date().toISOString().slice(0, 10));
}

export default function PromotionsBoard({ promotions, error, startOpen = false }: { promotions: PromotionRow[]; error?: string; startOpen?: boolean }) {
  const [editing, setEditing] = useState<PromotionRow | null | undefined>(startOpen ? null : undefined);
  useEffect(() => {
    if (startOpen) setEditing(null);
  }, [startOpen]);
  return (
    <>
      <AdminPageHeader
        title="Promotions"
        description="A banner appears on the homepage only when it is published, active, and inside its dates."
        action={<button className="button primary" type="button" onClick={() => setEditing(null)}>Add promotion</button>}
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {promotions.length === 0 ? <AdminEmptyState title="No promotions yet">Create one when there is a confirmed offer to share.</AdminEmptyState> : (
        <div className="admin-cards">
          {promotions.map((item) => (
            <article className="admin-promo" key={item.id}>
              <div className="admin-promo-art" aria-hidden="true">{item.title.slice(0, 1)}</div>
              <div>
                <h2>{item.title}</h2>
                <p>{item.body || 'No description yet.'}</p>
                <p className="admin-muted">{item.starts_at || 'No start'} – {item.ends_at || 'No end'}</p>
                <p className="admin-badges">
                  <AdminStatusBadge status={item.status} />
                  {expired(item) ? <AdminStatusBadge status="archived">Expired</AdminStatusBadge> : null}
                  {item.active ? <AdminStatusBadge status="active">Active</AdminStatusBadge> : <AdminStatusBadge status="archived">Inactive</AdminStatusBadge>}
                </p>
                <button className="button secondary" type="button" onClick={() => setEditing(item)}>Edit</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined ? (
        <AdminDrawer title={editing ? editing.title : 'Add promotion'} description="Promotions do not store a separate photo. The card uses the title." onClose={() => setEditing(undefined)}>
          <form className="admin-form" action={savePromotionAction}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <label>Title<input name="title" required defaultValue={editing?.title || ''} /></label>
            <label>Description<textarea name="body" defaultValue={editing?.body || ''} /></label>
            <label>Link<input name="href" defaultValue={editing?.href || ''} placeholder="/menu" /></label>
            <label>Kind
              <select name="kind" defaultValue={editing?.kind || 'banner'}>
                <option value="banner">Banner</option>
                <option value="featured">Featured</option>
              </select>
            </label>
            <label>Starts<input name="startsAt" type="date" defaultValue={editing?.starts_at || ''} /></label>
            <label>Ends<input name="endsAt" type="date" defaultValue={editing?.ends_at || ''} /></label>
            <label>Publication status
              <select name="status" defaultValue={editing?.status || 'draft'}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="admin-switch"><input name="active" type="checkbox" defaultChecked={editing ? Boolean(editing.active) : false} /> Active</label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setEditing(undefined)}>Cancel</button>
              <SubmitButton>Save promotion</SubmitButton>
            </div>
          </form>
        </AdminDrawer>
      ) : null}
    </>
  );
}
