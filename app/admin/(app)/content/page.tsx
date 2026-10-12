import { rollbackContentAction, saveContentAction } from '@/app/admin/actions';
import { currentUser } from '@/lib/admin/current-user';
import { readSiteDocument } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const document = await readSiteDocument(await currentUser());
  const content = document.draft;
  return (
    <>
      <h1>Website content</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <p className="admin-muted">Save a draft to keep working. Publish replaces the live homepage, about text, phone, and social links. Photo credits stay in the footer.</p>
      <form className="admin-card admin-form" action={saveContentAction}>
        <label>Hero line<input name="heroLine" defaultValue={content.heroLine} /></label>
        <label>Hero accent<input name="heroAccent" defaultValue={content.heroAccent} /></label>
        <label>Hero text<textarea name="heroBody" defaultValue={content.heroBody} /></label>
        <label>About paragraph 1<textarea name="about1" defaultValue={content.aboutParagraphs[0] || ''} /></label>
        <label>About paragraph 2<textarea name="about2" defaultValue={content.aboutParagraphs[1] || ''} /></label>
        <label>About paragraph 3<textarea name="about3" defaultValue={content.aboutParagraphs[2] || ''} /></label>
        <label>Closing heading<input name="aboutCloseTitle" defaultValue={content.aboutCloseTitle} /></label>
        <label>Closing text<textarea name="aboutCloseBody" defaultValue={content.aboutCloseBody} /></label>
        <label>Phone display<input name="phoneDisplay" defaultValue={content.phoneDisplay} /></label>
        <label>Phone link<input name="phoneHref" defaultValue={content.phoneHref} /></label>
        <label>Email<input name="email" type="email" defaultValue={content.email} /></label>
        <label>Hours note<textarea name="hoursNote" defaultValue={content.hoursNote} /></label>
        <label>Instagram URL<input name="instagram" defaultValue={content.instagram} /></label>
        <label>Facebook URL<input name="facebook" defaultValue={content.facebook} /></label>
        <label>DoorDash URL<input name="doordash" defaultValue={content.doordash} placeholder="Leave blank until confirmed" /></label>
        <label>Uber Eats URL<input name="uberEats" defaultValue={content.uberEats} /></label>
        <label>Grubhub URL<input name="grubhub" defaultValue={content.grubhub} /></label>
        <div className="admin-actions">
          <button className="button secondary" type="submit" name="intent" value="draft">Save draft</button>
          <button className="button primary" type="submit" name="intent" value="publish">Publish content</button>
        </div>
      </form>
      <form action={rollbackContentAction}>
        <button className="button secondary" type="submit">Restore the previous published version</button>
      </form>
    </>
  );
}
