import { retryInquiryAction, savePackageAction, updateInquiryAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { currentUser } from '@/lib/admin/current-user';
import { listInquiries, listPackages } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

const statuses = ['received', 'email_prepared', 'reviewing', 'contacted', 'closed'];

export default async function CateringAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const user = await currentUser();
  const packages = (await listPackages(user)) as { id: string; name: string; description: string; pricing_note: string; status: string }[];
  const inquiries = (await listInquiries(user)) as {
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
    notification_status?: string;
    notification_error?: string;
  }[];
  return (
    <>
      <h1>Catering</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <p className="admin-muted">A saved inquiry is on this website even when its email notice is still pending or failed. It is marked emailed only after the email service accepts it.</p>
      <section className="admin-card">
        <h2>Packages</h2>
        {packages.length === 0 ? <p>No packages yet. The public catering page stays as it is until you publish one.</p> : null}
        {packages.map((item) => (
          <form className="admin-form two" action={savePackageAction} key={item.id}>
            <input type="hidden" name="id" value={item.id} />
            <label>Name<input name="name" defaultValue={item.name} required /></label>
            <label>Status
              <select name="status" defaultValue={item.status}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>Description<textarea name="description" defaultValue={item.description} /></label>
            <label>Pricing note<textarea name="pricingNote" defaultValue={item.pricing_note} placeholder="Leave blank if pricing is not confirmed." /></label>
            <SubmitButton>Save package</SubmitButton>
          </form>
        ))}
        <form className="admin-form two" action={savePackageAction}>
          <h3>Add a package</h3>
          <label>Name<input name="name" required /></label>
          <label>Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label>Description<textarea name="description" /></label>
          <label>Pricing note<textarea name="pricingNote" /></label>
          <SubmitButton>Save package</SubmitButton>
        </form>
      </section>
      <section className="admin-card">
        <h2>Inquiries</h2>
        {inquiries.length === 0 ? <p>No inquiries have been prepared yet.</p> : null}
        {inquiries.map((inquiry) => (
          <form className="admin-form" action={updateInquiryAction} key={inquiry.id}>
            <input type="hidden" name="id" value={inquiry.id} />
            <p><strong>{inquiry.name}</strong> · {inquiry.event_type} · {inquiry.event_date} · {inquiry.guests} guests</p>
            <p className="admin-muted">{inquiry.email}{inquiry.phone ? ` · ${inquiry.phone}` : ''} · {inquiry.location}</p>
            <p>{inquiry.details || 'No extra details.'}</p>
            <p className="admin-muted">
              Saved on the website. Email notice: {inquiry.notification_status || 'not recorded'}
              {inquiry.notification_error ? ` — ${inquiry.notification_error}` : ''}
            </p>
            {inquiry.notification_status === 'pending' || inquiry.notification_status === 'failed' ? (
              <form action={retryInquiryAction}>
                <input type="hidden" name="id" value={inquiry.id} />
                <button className="button secondary" type="submit">Retry email notice</button>
              </form>
            ) : null}
            <label>Status
              <select name="status" defaultValue={inquiry.status}>
                {statuses.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label>Internal note<textarea name="note" defaultValue={inquiry.internal_note} /></label>
            <SubmitButton>Update inquiry</SubmitButton>
          </form>
        ))}
      </section>
    </>
  );
}
