import { saveStopAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { currentUser } from '@/lib/admin/current-user';
import { listStops } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const stops = (await listStops(await currentUser())) as {
    id: string;
    name: string;
    address: string;
    starts_at: string;
    ends_at: string;
    hours: string;
    status: string;
    visible: number;
  }[];
  return (
    <>
      <h1>Truck locations</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <p className="admin-muted">Nothing is shown on Find Us until a stop is published and marked visible. Do not invent a stop the business has not confirmed.</p>
      {stops.length === 0 ? <p className="admin-card">No stops yet. The public page will keep the “coming soon” message.</p> : null}
      {stops.map((stop) => (
        <form className="admin-card admin-form two" action={saveStopAction} key={stop.id}>
          <input type="hidden" name="id" value={stop.id} />
          <label>Name<input name="name" defaultValue={stop.name} required /></label>
          <label>Address<input name="address" defaultValue={stop.address} required /></label>
          <label>Starts<input name="startsAt" type="datetime-local" defaultValue={stop.starts_at} required /></label>
          <label>Ends<input name="endsAt" type="datetime-local" defaultValue={stop.ends_at} required /></label>
          <label>Hours note<input name="hours" defaultValue={stop.hours} /></label>
          <label>Status
            <select name="status" defaultValue={stop.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="admin-checks"><input name="visible" type="checkbox" defaultChecked={Boolean(stop.visible)} /> Visible on the website</label>
          <SubmitButton>Save stop</SubmitButton>
        </form>
      ))}
      <form className="admin-card admin-form two" action={saveStopAction}>
        <h2>Add a stop</h2>
        <label>Name<input name="name" required /></label>
        <label>Address<input name="address" required /></label>
        <label>Starts<input name="startsAt" type="datetime-local" required /></label>
        <label>Ends<input name="endsAt" type="datetime-local" required /></label>
        <label>Hours note<input name="hours" /></label>
        <label>Status
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="admin-checks"><input name="visible" type="checkbox" /> Visible on the website</label>
        <SubmitButton>Save stop</SubmitButton>
      </form>
    </>
  );
}
