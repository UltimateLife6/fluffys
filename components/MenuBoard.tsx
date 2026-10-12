'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import type { MenuCategory } from '@/lib/data';
import { selectedCategory } from '@/lib/menu-selection';
import { track } from '@/lib/track';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MenuBoard({ categories, preview = false }: { categories: MenuCategory[]; preview?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = params.get('category');
  const selected = selectedCategory(
    categories.map((category) => category.name),
    requested,
  );
  const listedPrice = categories.some((category) => category.items.some((item) => item.priceCents != null));

  useEffect(() => {
    track('menu_view', selected === 'All' ? {} : { category: selected });
  }, [selected]);

  function selectCategory(name: string) {
    if (name === selected) return;
    const next = new URLSearchParams(params.toString());
    if (name === 'All') next.delete('category');
    else next.set('category', name);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const visible = selected === 'All' ? categories : categories.filter((category) => category.name === selected);

  return (
    <>
      <PageHeader kicker="Find your favorite" title="The menu">
        Big personality. Bigger flavor. There&apos;s something for every craving.
      </PageHeader>
      {preview ? <p className="shell preview-note">Draft preview. These unpublished changes are not on the public menu.</p> : null}
      <section className="shell menu-section">
        <div className="filter-bar">
          <div className="filter-bar-scroll" role="toolbar" aria-label="Menu categories">
            <button type="button" className={selected === 'All' ? 'active' : ''} onClick={() => selectCategory('All')} aria-pressed={selected === 'All'}>
              All
            </button>
            {categories.map((category) => (
              <button
                type="button"
                className={selected === category.name ? 'active' : ''}
                onClick={() => selectCategory(category.name)}
                aria-pressed={selected === category.name}
                key={category.name}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? <p className="empty-state">No published dishes are listed right now.</p> : null}
        <div className={visible.length === 1 ? 'menu-grid single' : 'menu-grid'}>
          {visible.map((category) => (
            <article className="menu-group" key={category.name}>
              <div className="menu-photo">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  sizes="(max-width: 800px) 100vw, 50vw"
                  style={category.imagePosition ? { objectPosition: category.imagePosition } : undefined}
                />
              </div>
              <div className="menu-group-body">
                <p className="kicker">Fluffy&apos;s favorites</p>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
                <ul className="menu-items">
                  {category.items.map((item) => (
                    <li className="menu-item" key={item.id || item.name}>
                      <button
                        type="button"
                        className="menu-item-name"
                        onClick={() => track('menu_item_view', { itemId: item.id || item.name, category: category.name })}
                      >
                        {item.name}
                        {item.featured ? <span className="menu-flag"> Featured</span> : null}
                        {item.available === false ? <span className="menu-flag sold-out"> Sold out</span> : null}
                        {item.priceCents != null ? <span className="menu-price"> {money(item.priceCents)}</span> : null}
                      </button>
                      {item.note ? <span className="menu-item-note">{item.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <p className="menu-disclaimer">
          Menu is subject to change based on ingredient availability.{' '}
          {listedPrice
            ? 'Prices shown are set by the restaurant and can change.'
            : "Prices are not listed here and can be confirmed directly with Fluffy's Bistro."}
        </p>
      </section>
    </>
  );
}
