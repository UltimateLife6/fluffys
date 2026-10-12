import { ConfirmForm, SubmitButton } from '@/components/admin/Controls';
import {
  categoryStatusAction,
  itemStatusAction,
  moveCategoryAction,
  moveItemAction,
  saveCategoryAction,
  saveItemAction,
  uploadImageAction,
} from '@/app/admin/actions';
import { currentUser } from '@/lib/admin/current-user';
import { listCategories } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

function dollars(cents: unknown) {
  if (cents == null || cents === '') return '';
  return (Number(cents) / 100).toFixed(2);
}

export default async function MenuAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; uploaded?: string }> }) {
  const params = await searchParams;
  const categories = (await listCategories(await currentUser(), true)) as {
    id: string;
    name: string;
    description: string;
    image: string;
    image_alt: string;
    image_position: string | null;
    status: string;
    items: {
      id: string;
      name: string;
      note: string;
      price_cents: number | null;
      available: number;
      featured: number;
      image: string | null;
      status: string;
      category_id: string;
    }[];
  }[];

  return (
    <>
      <h1>Menu manager</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      {params.uploaded ? <p role="status">Uploaded image path: {params.uploaded}</p> : null}
      <p className="admin-muted">New items start as drafts. Only published items appear on the public menu. Prices stay hidden until you enter one.</p>
      <section className="admin-card">
        <h2>Add a category</h2>
        <form className="admin-form two" action={saveCategoryAction}>
          <label>Name<input name="name" required /></label>
          <label>Image path<input name="image" placeholder="/food/sides.jpg" /></label>
          <label>Image description<input name="imageAlt" /></label>
          <label>Image position<input name="imagePosition" placeholder="center 50%" /></label>
          <label>Description<textarea name="description" /></label>
          <SubmitButton>Save draft category</SubmitButton>
        </form>
        <form className="admin-form" action={uploadImageAction}>
          <input type="hidden" name="return" value="/admin/menu" />
          <label>Upload an image<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
          <SubmitButton>Upload</SubmitButton>
        </form>
      </section>
      {categories.length === 0 ? <p className="admin-card">No categories yet. Run the local seed or add one above.</p> : null}
      {categories.map((category) => (
        <section className="admin-card" key={category.id}>
          <h2>{category.name}</h2>
          <p className="admin-muted">Status: {category.status}</p>
          <form className="admin-form two" action={saveCategoryAction}>
            <input type="hidden" name="id" value={category.id} />
            <label>Name<input name="name" defaultValue={category.name} required /></label>
            <label>Image path<input name="image" defaultValue={category.image} /></label>
            <label>Image description<input name="imageAlt" defaultValue={category.image_alt} /></label>
            <label>Image position<input name="imagePosition" defaultValue={category.image_position || ''} /></label>
            <label>Description<textarea name="description" defaultValue={category.description} /></label>
            <SubmitButton>Save category</SubmitButton>
          </form>
          <div className="admin-actions">
            <form action={categoryStatusAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="status" value="published" /><button className="button primary" type="submit">Publish</button></form>
            <form action={categoryStatusAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Unpublish</button></form>
            <ConfirmForm action={categoryStatusAction} message="Archive this category? It will leave the public menu.">
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="status" value="archived" />
              <button className="button secondary" type="submit">Archive</button>
            </ConfirmForm>
            {category.status === 'archived' ? (
              <form action={categoryStatusAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Restore to draft</button></form>
            ) : null}
            <form action={moveCategoryAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="direction" value="-1" /><button className="button secondary" type="submit">Move up</button></form>
            <form action={moveCategoryAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="direction" value="1" /><button className="button secondary" type="submit">Move down</button></form>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Item</th><th>Price</th><th>State</th><th></th></tr>
              </thead>
              <tbody>
                {category.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <form className="admin-form" action={saveItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="categoryId" value={category.id} />
                        <label>Name<input name="name" defaultValue={item.name} required /></label>
                        <label>Description<input name="note" defaultValue={item.note} /></label>
                        <label>Image path<input name="image" defaultValue={item.image || ''} /></label>
                        <label>Price, optional<input name="price" inputMode="decimal" defaultValue={dollars(item.price_cents)} placeholder="Leave blank" /></label>
                        <div className="admin-checks">
                          <label><input name="available" type="checkbox" defaultChecked={Boolean(item.available)} /> Available</label>
                          <label><input name="featured" type="checkbox" defaultChecked={Boolean(item.featured)} /> Featured</label>
                        </div>
                        <SubmitButton>Save item</SubmitButton>
                      </form>
                    </td>
                    <td>{item.price_cents == null ? 'Not listed' : `$${(item.price_cents / 100).toFixed(2)}`}</td>
                    <td>{item.status}{item.available ? '' : ' · sold out'}</td>
                    <td className="admin-actions">
                      <form action={itemStatusAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="published" /><button className="button primary" type="submit">Publish</button></form>
                      <form action={itemStatusAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Draft</button></form>
                      <ConfirmForm action={itemStatusAction} message="Archive this dish?">
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="status" value="archived" />
                        <button className="button secondary" type="submit">Archive</button>
                      </ConfirmForm>
                      <form action={moveItemAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="-1" /><button className="button secondary" type="submit">Up</button></form>
                      <form action={moveItemAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="1" /><button className="button secondary" type="submit">Down</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Add a dish</h3>
          <form className="admin-form two" action={saveItemAction}>
            <input type="hidden" name="categoryId" value={category.id} />
            <label>Name<input name="name" required /></label>
            <label>Description<input name="note" /></label>
            <label>Price, optional<input name="price" inputMode="decimal" /></label>
            <label>Image path<input name="image" /></label>
            <div className="admin-checks">
              <label><input name="available" type="checkbox" defaultChecked /> Available</label>
              <label><input name="featured" type="checkbox" /> Featured</label>
            </div>
            <SubmitButton>Save dish as draft</SubmitButton>
          </form>
        </section>
      ))}
    </>
  );
}
