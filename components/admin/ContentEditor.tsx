'use client';

import { useState } from 'react';
import { rollbackContentAction, saveContentAction } from '@/app/admin/actions';
import { ConfirmForm } from '@/components/admin/Controls';
import { AdminPageHeader } from '@/components/admin/ui';
import type { SiteContent } from '@/lib/admin/site-defaults';

const sections = [
  ['home', 'Homepage'],
  ['about', 'About'],
  ['contact', 'Contact information'],
  ['hours', 'Business hours'],
  ['social', 'Social media'],
  ['orders', 'Ordering links'],
] as const;

export default function ContentEditor({ content, updatedAt, error }: { content: SiteContent; updatedAt: string | null; error?: string }) {
  const [section, setSection] = useState<(typeof sections)[number][0]>('home');
  return (
    <>
      <AdminPageHeader
        title="Website content"
        description="Save a draft while you work. Publish replaces the live homepage, about text, contact details, and links. Photo credits stay in the footer."
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <p className="admin-muted">{updatedAt ? `Last updated ${updatedAt.replace('T', ' ').slice(0, 16)}.` : 'No saved draft timestamp yet.'} Published content stays in place until you publish.</p>
      <div className="admin-tabs" role="tablist" aria-label="Content sections">
        {sections.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      <form className="admin-card admin-form" action={saveContentAction}>
        <fieldset hidden={section !== 'home'}>
          <label>Hero line<input name="heroLine" defaultValue={content.heroLine} /></label>
          <label>Hero accent<input name="heroAccent" defaultValue={content.heroAccent} /></label>
          <label>Hero text<textarea name="heroBody" defaultValue={content.heroBody} /></label>
        </fieldset>
        <fieldset hidden={section !== 'about'}>
          <label>About paragraph 1<textarea name="about1" defaultValue={content.aboutParagraphs[0] || ''} /></label>
          <label>About paragraph 2<textarea name="about2" defaultValue={content.aboutParagraphs[1] || ''} /></label>
          <label>About paragraph 3<textarea name="about3" defaultValue={content.aboutParagraphs[2] || ''} /></label>
          <label>Closing heading<input name="aboutCloseTitle" defaultValue={content.aboutCloseTitle} /></label>
          <label>Closing text<textarea name="aboutCloseBody" defaultValue={content.aboutCloseBody} /></label>
        </fieldset>
        <fieldset hidden={section !== 'contact'}>
          <label>Phone display<input name="phoneDisplay" defaultValue={content.phoneDisplay} /></label>
          <label>Phone link<input name="phoneHref" defaultValue={content.phoneHref} /></label>
          <label>Email<input name="email" type="email" defaultValue={content.email} /></label>
        </fieldset>
        <fieldset hidden={section !== 'hours'}>
          <label>Hours note<textarea name="hoursNote" defaultValue={content.hoursNote} /></label>
          <p className="admin-muted">Leave this as a note until a public address and hours are confirmed. Do not invent them.</p>
        </fieldset>
        <fieldset hidden={section !== 'social'}>
          <label>Instagram URL<input name="instagram" defaultValue={content.instagram} /></label>
          <label>Facebook URL<input name="facebook" defaultValue={content.facebook} /></label>
        </fieldset>
        <fieldset hidden={section !== 'orders'}>
          <label>DoorDash URL<input name="doordash" defaultValue={content.doordash} placeholder="Leave blank until confirmed" /></label>
          <label>Uber Eats URL<input name="uberEats" defaultValue={content.uberEats} /></label>
          <label>Grubhub URL<input name="grubhub" defaultValue={content.grubhub} /></label>
          <p className="admin-muted">A link must start with https://. Anything else is removed when you save, and the published site keeps the last valid value until you publish.</p>
        </fieldset>
        <div className="admin-form-actions">
          <button className="button secondary" type="submit" name="intent" value="draft">Save draft</button>
          <button className="button primary" type="submit" name="intent" value="publish">Publish</button>
        </div>
      </form>
      <ConfirmForm action={rollbackContentAction} message="Restore the previous published version? The current draft will be replaced by that version.">
        <button className="button secondary" type="submit">Restore previous published version</button>
      </ConfirmForm>
    </>
  );
}
