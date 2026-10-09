import type { Metadata } from 'next';
import { Suspense } from 'react';
import MenuBoard from '@/components/MenuBoard';

export const metadata: Metadata = {
  title: 'Menu',
  description:
    "Explore Fluffy's Bistro menu: Korean BBQ bowls, Cajun seafood, po'boys, sides, funnel cakes, and specialty lemonades.",
};

export default function MenuPage() {
  return (
    <Suspense fallback={<p className="shell menu-loading">Loading the menu…</p>}>
      <MenuBoard />
    </Suspense>
  );
}
