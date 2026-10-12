'use client';

import { useState } from 'react';
import { retryInquiryAction, savePackageAction, updateInquiryAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { AdminDrawer } from '@/components/admin/Drawer';
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from '@/components/admin/ui';

const leadTabs = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'booked', label: 'Booked' },
  { id: 'closed', label: 'Closed' },
] as const;

const statuses = [
  ['received', 'New'],
  ['email_prepared', 'Email prepared'],
  ['reviewing', 'In review'],
  ['contacted', 'Contacted'],
  ['quoted', 'Quoted'],
  ['booked', 'Booked'],
  ['closed', 'Closed'],
] as const;

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  guests: string;
  location: string;
  details: string;
  status: string;
  internal_note: string;
  created_at: string;
  notification_status?: string;
  notification_error?: string;
};

export type PackageRow = {
  id: string;
  name: string;
  description: string;
  pricing_note: string;
  status: string;
};

export default function CateringBoard({ inquiries, packages, error }: { inquiries: InquiryRow[]; packages: PackageRow[]; error?: string }) {
  const [tab, setTab] = useState<(typeof leadTabs)[number]['id'] | 'packages'>('all');
  const [selected, setSelected] = useState<InquiryRow | null>(null);
  const [editingPackage, setEditingPackage] = useState<PackageRow | null | undefined>(undefined);
  const rows = inquiries.filter((inquiry) => {
    if (tab === 'all' || tab === 'packages') return true;
    if (tab === 'received') return inquiry.status === 'received' || inquiry.status === 'email_prepared' || inquiry.status === 'reviewing';
    return inquiry.status === tab;
  });

  return (
    <>
      <AdminPageHeader
        title="Catering"
        description="A saved inquiry stays here even when the email notice is still pending. Internal notes stay in the dashboard."
        action={tab === 'packages' ? <button className="button primary" type="button" onClick={() => setEditingPackage(null)}>Add package</button> : null}
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="admin-tabs" role="tablist" aria-label="Catering sections">
        {leadTabs.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
            {item.label}
            <small>{item.id === 'all' ? inquiries.length : inquiries.filter((inquiry) => (item.id === 'received' ? ['received', 'email_prepared', 'reviewing'].includes(inquiry.status) : inquiry.status === item.id)).length}</small>
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === 'packages'} onClick={() => setTab('packages')}>Packages</button>
      </div>
      {tab === 'packages' ? (
        packages.length === 0 ? <AdminEmptyState title="No catering packages">The public catering page stays as it is until you publish one.</AdminEmptyState> : (
          <div className="admin-cards">
            {packages.map((item) => (
              <article className="admin-card" key={item.id}>
                <header><h2>{item.name}</h2><AdminStatusBadge status={item.status} /></header>
                <p>{item.description || 'No description yet.'}</p>
                <button className="button secondary" type="button" onClick={() => setEditingPackage(item)}>Edit</button>
              </article>
            ))}
          </div>
        )
      ) : rows.length === 0 ? <AdminEmptyState title="No inquiries in this view">New catering requests appear here after someone submits the form.</AdminEmptyState> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Customer</th><th>Contact</th><th>Event</th><th>Guests</th><th>Lead</th><th>Email notice</th><th>Received</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td data-label="Customer"><strong>{inquiry.name}</strong></td>
                  <td data-label="Contact">{inquiry.email}{inquiry.phone ? <><br />{inquiry.phone}</> : null}</td>
                  <td data-label="Event">{inquiry.event_type}<br />{inquiry.event_date}</td>
                  <td data-label="Guests">{inquiry.guests || '—'}</td>
                  <td data-label="Lead"><AdminStatusBadge status={inquiry.status} /></td>
                  <td data-label="Email notice"><AdminStatusBadge status={inquiry.notification_status || 'pending'} /></td>
                  <td data-label="Received">{inquiry.created_at.replace('T', ' ').slice(0, 16)}</td>
                  <td data-label="Actions"><button className="button secondary" type="button" onClick={() => setSelected(inquiry)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected ? (
        <AdminDrawer title={selected.name} description="Lead status and the email notice are separate. Notes on this screen are not published." onClose={() => setSelected(null)}>
          <p>{selected.event_type} · {selected.event_date}{selected.guests ? ` · ${selected.guests} guests` : ''}</p>
          <p><a href={`mailto:${selected.email}`}>{selected.email}</a>{selected.phone ? ` · ${selected.phone}` : ''}</p>
          <p>{selected.location}</p>
          <p>{selected.details || 'No extra details.'}</p>
          <p className="admin-muted">Email notice: {selected.notification_status || 'not recorded'}{selected.notification_error ? ` — ${selected.notification_error}` : ''}</p>
          {selected.notification_status === 'pending' || selected.notification_status === 'failed' ? (
            <form action={retryInquiryAction}>
              <input type="hidden" name="id" value={selected.id} />
              <button className="button secondary" type="submit">Retry email notice</button>
            </form>
          ) : null}
          <form className="admin-form" action={updateInquiryAction}>
            <input type="hidden" name="id" value={selected.id} />
            <label>Lead status
              <select name="status" defaultValue={selected.status}>
                {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>Internal note<textarea name="note" defaultValue={selected.internal_note} /></label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setSelected(null)}>Cancel</button>
              <SubmitButton>Save inquiry</SubmitButton>
            </div>
          </form>
        </AdminDrawer>
      ) : null}
      {editingPackage !== undefined ? (
        <AdminDrawer title={editingPackage ? editingPackage.name : 'Add package'} description="Leave pricing blank until it is confirmed." onClose={() => setEditingPackage(undefined)}>
          <form className="admin-form" action={savePackageAction}>
            {editingPackage ? <input type="hidden" name="id" value={editingPackage.id} /> : null}
            <label>Name<input name="name" required defaultValue={editingPackage?.name || ''} /></label>
            <label>Description<textarea name="description" defaultValue={editingPackage?.description || ''} /></label>
            <label>Pricing note<textarea name="pricingNote" defaultValue={editingPackage?.pricing_note || ''} /></label>
            <label>Status
              <select name="status" defaultValue={editingPackage?.status || 'draft'}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setEditingPackage(undefined)}>Cancel</button>
              <SubmitButton>Save package</SubmitButton>
            </div>
          </form>
        </AdminDrawer>
      ) : null}
    </>
  );
}
