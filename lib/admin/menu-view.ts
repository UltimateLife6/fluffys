export type MenuItemView = {
  id: string;
  name: string;
  note: string;
  price_cents: number | null;
  available: number;
  featured: number;
  image: string | null;
  status: string;
  category_id: string;
  sort_order: number;
};

export type MenuCategoryView = {
  id: string;
  name: string;
  description: string;
  image: string;
  image_alt: string;
  image_position: string | null;
  status: string;
  sort_order: number;
  items: MenuItemView[];
};

export type MenuFilters = {
  query: string;
  categoryId: string;
  status: string;
  availability: string;
  sort: 'menu' | 'name' | 'price-asc' | 'price-desc' | 'status';
};

export type MenuRow = MenuItemView & { categoryName: string; categoryOrder: number };

export function filterMenuItems(categories: MenuCategoryView[], filters: MenuFilters): MenuRow[] {
  const query = filters.query.trim().toLowerCase();
  const rows = categories.flatMap((category) =>
    category.items.map((item) => ({ ...item, categoryName: category.name, categoryOrder: category.sort_order })),
  );
  const filtered = rows.filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false;
    if (filters.categoryId && item.category_id !== filters.categoryId) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.availability === 'available' && !item.available) return false;
    if (filters.availability === 'unavailable' && item.available) return false;
    return true;
  });
  filtered.sort((left, right) => {
    if (filters.sort === 'name') return left.name.localeCompare(right.name);
    if (filters.sort === 'price-asc') return (left.price_cents ?? -1) - (right.price_cents ?? -1);
    if (filters.sort === 'price-desc') return (right.price_cents ?? -1) - (left.price_cents ?? -1);
    if (filters.sort === 'status') return left.status.localeCompare(right.status) || left.name.localeCompare(right.name);
    return left.categoryOrder - right.categoryOrder || left.sort_order - right.sort_order || left.name.localeCompare(right.name);
  });
  return filtered;
}

export function dollarsInput(cents: number | null) {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

export function moneyLabel(cents: number | null) {
  if (cents == null) return 'Not listed';
  return `$${(cents / 100).toFixed(2)}`;
}
