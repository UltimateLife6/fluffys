import MenuManager from '@/components/admin/MenuManager';
import { currentUser } from '@/lib/admin/current-user';
import { listCategories } from '@/lib/admin/gateway';
import type { MenuCategoryView } from '@/lib/admin/menu-view';

export const dynamic = 'force-dynamic';

export default async function MenuAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; tab?: string; compose?: string }> }) {
  const params = await searchParams;
  const categories = (await listCategories(await currentUser(), true)) as MenuCategoryView[];
  return (
    <MenuManager
      categories={categories.map((category) => ({
        ...category,
        description: String(category.description || ''),
        image: String(category.image || ''),
        image_alt: String(category.image_alt || ''),
        image_position: category.image_position ? String(category.image_position) : null,
        status: String(category.status),
        sort_order: Number(category.sort_order || 0),
        items: category.items.map((item) => ({
          ...item,
          note: String(item.note || ''),
          price_cents: item.price_cents == null ? null : Number(item.price_cents),
          available: Number(item.available),
          featured: Number(item.featured),
          image: item.image ? String(item.image) : null,
          status: String(item.status),
          sort_order: Number(item.sort_order || 0),
          category_id: String(item.category_id),
        })),
      }))}
      initialTab={params.tab === 'categories' ? 'categories' : 'items'}
      initialCompose={params.compose}
      notice={params.notice}
      error={params.error}
    />
  );
}
