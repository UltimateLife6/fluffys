'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { categories } from '@/lib/data';

export default function MenuBoard() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = params.get('category');
  const selected = requested && categories.some((category) => category.name === requested) ? requested : 'All';

  function selectCategory(name: string) {
    if (name === selected) return;
    const href = name === 'All' ? pathname : `${pathname}?category=${encodeURIComponent(name)}`;
    router.push(href, { scroll: false });
  }

  const visible = selected === 'All' ? categories : categories.filter((category) => category.name === selected);

  return (
    <>
      <PageHeader kicker="Find your favorite" title="The menu">
        Big personality. Bigger flavor. There&apos;s something for every craving.
      </PageHeader>
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
                    <li className="menu-item" key={item.name}>
                      <span className="menu-item-name">{item.name}</span>
                      {item.note ? <span className="menu-item-note">{item.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <p className="menu-disclaimer">
          Menu is subject to change based on ingredient availability. Prices are not listed here and can be confirmed
          directly with Fluffy&apos;s Bistro.
        </p>
      </section>
    </>
  );
}
