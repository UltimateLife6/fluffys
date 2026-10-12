import { savePromotionAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import { currentUser } from '@/lib/admin/current-user';
import { listPromotions } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const promotions = (await listPromotions(await currentUser())) as {
    id: string;
    title: string;
    body: string;
    href: string;
    kind: string;
    starts_at: string | null;
    ends_at: string | null;
    active: number;
    status: string;
  }[];
  return (
    <>
      <h1>Promotions</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <p className="admin-muted">A banner appears on the homepage only when it is published, active, and inside its dates.</p>
      {promotions.length === 0 ? <p className="admin-card">No promotions yet.</p> : null}
      {promotions.map((item) => (
        <form className="admin-card admin-form two" action={savePromotionAction} key={item.id}>
          <input type="hidden" name="id" value={item.id} />
          <label>Title<input name="title" defaultValue={item.title} required /></label>
          <label>Link<input name="href" defaultValue={item.href} placeholder="/menu" /></label>
          <label>Message<textarea name="body" defaultValue={item.body} /></label>
          <label>Kind
            <select name="kind" defaultValue={item.kind}>
              <option value="banner">Banner</option>
              <option value="featured">Featured</option>
            </select>
          </label>
          <label>Starts<input name="startsAt" type="date" defaultValue={item.starts_at || ''} /></label>
          <label>Ends<input name="endsAt" type="date" defaultValue={item.ends_at || ''} /></label>
          <label>Status
            <select name="status" defaultValue={item.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="admin-checks"><input name="active" type="checkbox" defaultChecked={Boolean(item.active)} /> Active</label>
          <SubmitButton>Save promotion</SubmitButton>
        </form>
      ))}
      <form className="admin-card admin-form two" action={savePromotionAction}>
        <h2>Add a promotion</h2>
        <label>Title<input name="title" required /></label>
        <label>Link<input name="href" placeholder="/menu" /></label>
        <label>Message<textarea name="body" /></label>
        <label>Kind
          <select name="kind" defaultValue="banner"><option value="banner">Banner</option><option value="featured">Featured</option></select>
        </label>
        <label>Starts<input name="startsAt" type="date" /></label>
        <label>Ends<input name="endsAt" type="date" /></label>
        <label>Status
          <select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="published">Published</option></select>
        </label>
        <label className="admin-checks"><input name="active" type="checkbox" /> Active</label>
        <SubmitButton>Save promotion</SubmitButton>
      </form>
    </>
  );
}
