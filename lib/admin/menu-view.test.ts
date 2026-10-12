import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeSummary, filterActivity } from './activity-view.ts';
import { filterMenuItems, type MenuCategoryView } from './menu-view.ts';

const categories: MenuCategoryView[] = [
  {
    id: 'seafood',
    name: 'Seafood',
    description: '',
    image: '',
    image_alt: '',
    image_position: null,
    status: 'published',
    sort_order: 1,
    items: [
      { id: 'catfish', name: 'Catfish Plate', note: '', price_cents: 1500, available: 1, featured: 0, image: null, status: 'published', category_id: 'seafood', sort_order: 0 },
      { id: 'draft', name: 'Secret Stew', note: '', price_cents: null, available: 0, featured: 1, image: null, status: 'draft', category_id: 'seafood', sort_order: 1 },
    ],
  },
  {
    id: 'bowls',
    name: 'Bowls',
    description: '',
    image: '',
    image_alt: '',
    image_position: null,
    status: 'published',
    sort_order: 0,
    items: [
      { id: 'bowl', name: 'BBQ Bowl', note: '', price_cents: 1400, available: 1, featured: 0, image: null, status: 'archived', category_id: 'bowls', sort_order: 0 },
    ],
  },
];

test('menu search, filters, and sort stay on the saved records', () => {
  const base = { query: '', categoryId: '', status: '', availability: '', sort: 'menu' as const };
  assert.deepEqual(filterMenuItems(categories, { ...base, query: 'cat' }).map((item) => item.id), ['catfish']);
  assert.deepEqual(filterMenuItems(categories, { ...base, status: 'draft' }).map((item) => item.id), ['draft']);
  assert.deepEqual(filterMenuItems(categories, { ...base, availability: 'unavailable' }).map((item) => item.id), ['draft']);
  assert.deepEqual(filterMenuItems(categories, { ...base, sort: 'price-desc' }).map((item) => item.id), ['catfish', 'bowl', 'draft']);
  assert.deepEqual(filterMenuItems(categories, base).map((item) => item.id), ['bowl', 'catfish', 'draft']);
});

test('activity filters do not invent rows and hide secret field names', () => {
  const logs = [
    { id: '1', created_at: '2026-10-11T12:00:00.000Z', role: 'OWNER', action: 'menu_item.update', entity_type: 'menu_item', entity_id: 'dish', user_id: 'owner-1', before_json: '{"name":"Old","password":"[redacted]"}', after_json: '{"name":"New","password":"[redacted]"}' },
    { id: '2', created_at: '2026-10-01T12:00:00.000Z', role: 'NOCTARIS_ADMIN', action: 'user.invite', entity_type: 'user', entity_id: 'acct', user_id: 'admin-1', before_json: null, after_json: '{"email":"a@example.com"}' },
  ];
  assert.deepEqual(filterActivity(logs, { query: 'catfish', action: '', user: '', from: '', to: '' }).map((log) => log.id), []);
  assert.deepEqual(filterActivity(logs, { query: '', action: 'user.invite', user: '', from: '2026-10-10', to: '' }).map((log) => log.id), []);
  assert.equal(changeSummary(logs[0].before_json, logs[0].after_json), 'name');
});
