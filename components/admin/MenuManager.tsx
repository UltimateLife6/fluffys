'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  categoryStatusAction,
  itemStatusAction,
  moveCategoryAction,
  moveItemAction,
  saveCategoryAction,
  saveItemAction,
} from '@/app/admin/actions';
import { ConfirmForm, SaveActions } from '@/components/admin/Controls';
import { AdminDrawer } from '@/components/admin/Drawer';
import { AdminImageUploader } from '@/components/admin/ImageField';
import { AdminEmptyState, AdminFilterBar, AdminPageHeader, AdminSearchInput, AdminStatusBadge, AdminThumb } from '@/components/admin/ui';
import { dollarsInput, filterMenuItems, moneyLabel, type MenuCategoryView, type MenuFilters, type MenuItemView } from '@/lib/admin/menu-view';

type Editor =
  | { kind: 'item'; item: MenuItemView | null }
  | { kind: 'category'; category: MenuCategoryView | null }
  | null;

export default function MenuManager({
  categories,
  initialTab,
  initialCompose,
  notice,
  error,
}: {
  categories: MenuCategoryView[];
  initialTab: 'items' | 'categories';
  initialCompose?: string;
  notice?: string;
  error?: string;
}) {
  const [tab, setTab] = useState(initialTab);
  const [filters, setFilters] = useState<MenuFilters>({ query: '', categoryId: '', status: '', availability: '', sort: 'menu' });
  const [editor, setEditor] = useState<Editor>(null);
  const [preview, setPreview] = useState({ name: '', note: '', price: '', available: true, image: '' });
  const rows = useMemo(() => filterMenuItems(categories, filters), [categories, filters]);
  const composed = useRef(false);
  useEffect(() => {
    if (composed.current || !initialCompose) return;
    composed.current = true;
    if (initialCompose === 'category') setEditor({ kind: 'category', category: null });
    if (initialCompose === 'item') openItem(null);
  }, [initialCompose]);

  function openItem(item: MenuItemView | null) {
    setPreview({
      name: item?.name || '',
      note: item?.note || '',
      price: dollarsInput(item?.price_cents ?? null),
      available: item ? Boolean(item.available) : true,
      image: item?.image || '',
    });
    setEditor({ kind: 'item', item });
  }

  return (
    <>
      <AdminPageHeader
        title="Menu"
        description="Search the menu, then edit one dish at a time. Saving keeps the current draft or published state."
        action={
          <button className="button primary" type="button" onClick={() => (tab === 'categories' ? setEditor({ kind: 'category', category: null }) : openItem(null))}>
            {tab === 'categories' ? 'Add category' : 'Add item'}
          </button>
        }
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-note" role="status">{notice === 'published' ? 'Published. It can appear on the public menu.' : 'Saved. The publication state was left as it was.'}</p> : null}
      <div className="admin-tabs" role="tablist" aria-label="Menu sections">
        <button type="button" role="tab" aria-selected={tab === 'items'} onClick={() => setTab('items')}>Menu items</button>
        <button type="button" role="tab" aria-selected={tab === 'categories'} onClick={() => setTab('categories')}>Categories</button>
      </div>
      {tab === 'items' ? (
        <section className="admin-card">
          <AdminFilterBar>
            <AdminSearchInput label="Search dishes" placeholder="Search by name" value={filters.query} onChange={(query) => setFilters({ ...filters, query })} />
            <label>Category
              <select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>Status
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>Availability
              <select value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })}>
                <option value="">Any</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
            <label>Sort
              <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as MenuFilters['sort'] })}>
                <option value="menu">Menu order</option>
                <option value="name">Name</option>
                <option value="price-asc">Price, low to high</option>
                <option value="price-desc">Price, high to low</option>
                <option value="status">Status</option>
              </select>
            </label>
          </AdminFilterBar>
          {rows.length === 0 ? <AdminEmptyState title="No dishes match">Try another search, or add a menu item.</AdminEmptyState> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Status</th>
                    <th>Featured</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Item">
                        <span className="admin-identity">
                          <AdminThumb src={item.image} />
                          <strong>{item.name}</strong>
                        </span>
                      </td>
                      <td data-label="Category">{item.categoryName}</td>
                      <td data-label="Price">{moneyLabel(item.price_cents)}</td>
                      <td data-label="Availability"><AdminStatusBadge status={item.available ? 'available' : 'unavailable'}>{item.available ? 'Available' : 'Unavailable'}</AdminStatusBadge></td>
                      <td data-label="Status"><AdminStatusBadge status={item.status} /></td>
                      <td data-label="Featured">{item.featured ? <AdminStatusBadge status="featured">Featured</AdminStatusBadge> : '—'}</td>
                      <td data-label="Actions"><button className="button secondary" type="button" onClick={() => openItem(item)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="admin-card">
          {categories.length === 0 ? <AdminEmptyState title="No categories yet">Add a category before creating dishes.</AdminEmptyState> : (
            <ul className="admin-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <AdminThumb src={category.image} />
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.items.length} {category.items.length === 1 ? 'item' : 'items'}</small>
                  </span>
                  <AdminStatusBadge status={category.status} />
                  <span className="admin-order">Order {category.sort_order + 1}</span>
                  <span className="admin-actions">
                    <form action={moveCategoryAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="direction" value="-1" /><button className="button secondary" type="submit">Up</button></form>
                    <form action={moveCategoryAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="direction" value="1" /><button className="button secondary" type="submit">Down</button></form>
                    <button className="button secondary" type="button" onClick={() => setEditor({ kind: 'category', category })}>Edit</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {editor?.kind === 'item' ? (
        <AdminDrawer title={editor.item ? editor.item.name : 'Add menu item'} description="New dishes start as drafts. Publish when the dish should appear on the public menu." onClose={() => setEditor(null)}>
          <form className="admin-form" action={saveItemAction}>
            {editor.item ? <input type="hidden" name="id" value={editor.item.id} /> : null}
            <label>Name<input name="name" required defaultValue={editor.item?.name || ''} onChange={(event) => setPreview({ ...preview, name: event.target.value })} /></label>
            <label>Description<textarea name="note" defaultValue={editor.item?.note || ''} onChange={(event) => setPreview({ ...preview, note: event.target.value })} /></label>
            <label>Category
              <select name="categoryId" required defaultValue={editor.item?.category_id || categories[0]?.id || ''}>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>Price, optional<input name="price" inputMode="decimal" defaultValue={dollarsInput(editor.item?.price_cents ?? null)} placeholder="Leave blank to hide the price" onChange={(event) => setPreview({ ...preview, price: event.target.value })} /></label>
            <AdminImageUploader path={editor.item?.image || ''} alt={preview.name} onPreview={(image) => setPreview({ ...preview, image })} />
            <div className="admin-checks">
              <label className="admin-switch"><input name="available" type="checkbox" defaultChecked={editor.item ? Boolean(editor.item.available) : true} onChange={(event) => setPreview({ ...preview, available: event.target.checked })} /> Available</label>
              <label className="admin-switch"><input name="featured" type="checkbox" defaultChecked={Boolean(editor.item?.featured)} /> Featured</label>
            </div>
            <article className="admin-preview" aria-label="Public menu card preview">
              <AdminThumb src={preview.image || editor.item?.image} large />
              <div>
                <strong>{preview.name || 'Dish name'}</strong>
                <p>{preview.note || 'Description'}</p>
                <p>{preview.price ? `$${preview.price}` : 'Price not listed'}</p>
                {preview.available ? null : <AdminStatusBadge status="unavailable">Unavailable</AdminStatusBadge>}
              </div>
            </article>
            <p className="admin-muted">{editor.item ? `Current status: ${editor.item.status}. Saving does not publish or unpublish it.` : 'This dish will be saved as a draft.'}</p>
            <SaveActions saveLabel={editor.item?.status === 'published' ? 'Save' : 'Save draft'} onCancel={() => setEditor(null)} />
          </form>
          {editor.item ? (
            <div className="admin-actions">
              <form action={itemStatusAction}><input type="hidden" name="id" value={editor.item.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Move to draft</button></form>
              <form action={moveItemAction}><input type="hidden" name="id" value={editor.item.id} /><input type="hidden" name="direction" value="-1" /><button className="button secondary" type="submit">Move up</button></form>
              <form action={moveItemAction}><input type="hidden" name="id" value={editor.item.id} /><input type="hidden" name="direction" value="1" /><button className="button secondary" type="submit">Move down</button></form>
              {editor.item.status === 'archived' ? (
                <form action={itemStatusAction}><input type="hidden" name="id" value={editor.item.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Restore</button></form>
              ) : (
                <ConfirmForm action={itemStatusAction} message="Archive this dish? It will leave the public menu.">
                  <input type="hidden" name="id" value={editor.item.id} />
                  <input type="hidden" name="status" value="archived" />
                  <button className="button secondary" type="submit">Archive</button>
                </ConfirmForm>
              )}
            </div>
          ) : null}
        </AdminDrawer>
      ) : null}
      {editor?.kind === 'category' ? (
        <AdminDrawer title={editor.category ? editor.category.name : 'Add category'} description="A new category stays in draft until you publish it. Existing dishes keep their category." onClose={() => setEditor(null)}>
          <form className="admin-form" action={saveCategoryAction}>
            {editor.category ? <input type="hidden" name="id" value={editor.category.id} /> : null}
            <label>Name<input name="name" required defaultValue={editor.category?.name || ''} /></label>
            <label>Description<textarea name="description" defaultValue={editor.category?.description || ''} /></label>
            <AdminImageUploader path={editor.category?.image || ''} alt={editor.category?.image_alt || ''} />
            <label>Image description<input name="imageAlt" defaultValue={editor.category?.image_alt || ''} /></label>
            <label>Image position<input name="imagePosition" defaultValue={editor.category?.image_position || ''} placeholder="center 50%" /></label>
            <SaveActions saveLabel={editor.category?.status === 'published' ? 'Save' : 'Save draft'} onCancel={() => setEditor(null)} />
          </form>
          {editor.category ? (
            <div className="admin-actions">
              <form action={categoryStatusAction}><input type="hidden" name="id" value={editor.category.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Unpublish</button></form>
              {editor.category.status === 'archived' ? (
                <form action={categoryStatusAction}><input type="hidden" name="id" value={editor.category.id} /><input type="hidden" name="status" value="draft" /><button className="button secondary" type="submit">Restore</button></form>
              ) : (
                <ConfirmForm action={categoryStatusAction} message="Archive this category? Its dishes leave the public menu.">
                  <input type="hidden" name="id" value={editor.category.id} />
                  <input type="hidden" name="status" value="archived" />
                  <button className="button secondary" type="submit">Archive</button>
                </ConfirmForm>
              )}
            </div>
          ) : null}
        </AdminDrawer>
      ) : null}
    </>
  );
}
