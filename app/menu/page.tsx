import type { Metadata } from 'next';
import { Suspense } from 'react';
import MenuBoard from '@/components/MenuBoard';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    "Explore the Fluffy's Bistro menu: Korean BBQ bowls, Cajun seafood, po'boys, sides, funnel cakes, and specialty lemonades. Prices are confirmed with the truck.",
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: '/menu' } } : {}),
  openGraph: {
    title: "Menu | Fluffy's Bistro",
    description:
      "Explore the Fluffy's Bistro menu: Korean BBQ bowls, Cajun seafood, po'boys, sides, funnel cakes, and specialty lemonades. Prices are confirmed with the truck.",
  },
  twitter: {
    title: "Menu | Fluffy's Bistro",
    description:
      "Explore the Fluffy's Bistro menu: Korean BBQ bowls, Cajun seafood, po'boys, sides, funnel cakes, and specialty lemonades. Prices are confirmed with the truck.",
  },
};

export default function MenuPage() {
  return (
    <Suspense fallback={<p className="shell menu-loading">Loading the menu…</p>}>
      <MenuBoard />
    </Suspense>
  );
}
