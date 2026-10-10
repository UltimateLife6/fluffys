import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import PageHeader from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    "Fluffy's Bistro brings Cajun cooking and Asian-inspired flavor together. Learn about the food truck, then find the next stop or ask about catering.",
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: '/about' } } : {}),
  openGraph: {
    title: "About Us | Fluffy's Bistro",
    description:
      "Fluffy's Bistro brings Cajun cooking and Asian-inspired flavor together. Learn about the food truck, then find the next stop or ask about catering.",
  },
  twitter: {
    title: "About Us | Fluffy's Bistro",
    description:
      "Fluffy's Bistro brings Cajun cooking and Asian-inspired flavor together. Learn about the food truck, then find the next stop or ask about catering.",
  },
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
            Fluffy&apos;s Bistro brings two bold culinary worlds together: the comforting heat of Cajun cooking and the
            vibrant flavors of Asian-inspired cuisine.
          </p>
          <p>
            From Korean BBQ bowls to Cajun seafood and crispy po&apos;boys, our menu is built around big flavors and
            satisfying meals.
          </p>
          <p>We&apos;re bringing that experience to different communities, one stop at a time.</p>
          <Link className="button primary" href="/menu">
            See what&apos;s cooking <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="shell about-close" aria-labelledby="about-next">
        <div className="about-close-panel">
          <div>
            <h2 id="about-next">Good food is worth finding.</h2>
            <p>Follow Fluffy&apos;s Bistro for upcoming stops, or bring the flavor to your next event.</p>
          </div>
          <div className="button-row">
            <Link className="button primary" href="/find-us">
              Find the Truck <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button secondary" href="/catering">
              Explore Catering
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
