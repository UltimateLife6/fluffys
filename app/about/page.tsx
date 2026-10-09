import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import PageHeader from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'About',
  description:
    "Fluffy's Bistro is a Cajun Asian Fusion food truck serving Korean BBQ bowls, seafood, po'boys, funnel cakes, and lemonades.",
};

export default function About() {
  return (
    <>
      <PageHeader kicker="Cajun Asian Fusion" title="More than a meal.">
        Good food brings people together. That&apos;s what we&apos;re all about.
      </PageHeader>
      <section className="shell about-layout">
        <div className="about-mascot">
          <BrandLogo className="about-logo" />
        </div>
        <div className="about-copy">
          <p className="kicker">Who we are</p>
          <h2>Good food. Good company.</h2>
          <p>
            Fluffy&apos;s Bistro is a Cajun Asian Fusion food truck. The menu brings Korean BBQ bowls together with Cajun
            seafood, po&apos;boys, funnel cakes, and freshly made lemonades.
          </p>
          <p>
            The truck is more than a place to grab dinner. It is a place to try dishes made with fresh ingredients, then
            take that food to different spots around the city.
          </p>
          <p>Follow along on social media for surprise visits and the weekly schedule.</p>
          <Link className="button primary" href="/menu">
            See what&apos;s cooking <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
