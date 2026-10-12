import type { Metadata } from 'next';
import { Fredoka, Nunito, Pacifico } from 'next/font/google';
import { headers } from 'next/headers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnalyticsListener from '@/components/AnalyticsListener';
import ConsentNotice from '@/components/ConsentNotice';
import './globals.css';

const display = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const body = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-body',
});

const script = Pacifico({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "Fluffy's Bistro | Cajun Asian Fusion",
    template: "%s | Fluffy's Bistro",
  },
  description:
    "Cajun heat meets Asian-inspired flavor. Explore Korean BBQ bowls, seafood, po'boys, funnel cakes, lemonades, and catering from Fluffy's Bistro.",
  ...(siteUrl ? { alternates: { canonical: '/' } } : {}),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: "Fluffy's Bistro",
    title: "Fluffy's Bistro | Cajun Asian Fusion",
    description:
      "Cajun heat meets Asian-inspired flavor. Explore Korean BBQ bowls, seafood, po'boys, funnel cakes, lemonades, and catering from Fluffy's Bistro.",
  },
  twitter: {
    card: 'summary',
    title: "Fluffy's Bistro | Cajun Asian Fusion",
    description:
      "Cajun heat meets Asian-inspired flavor. Explore Korean BBQ bowls, seafood, po'boys, funnel cakes, lemonades, and catering from Fluffy's Bistro.",
  },
  icons: { icon: '/brand/fluffys-logo.png' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = (await headers()).get('x-admin') === '1';
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${script.variable}`}>
      <body>
        {admin ? null : <Header />}
        <main id="content">{children}</main>
        {admin ? null : <Footer />}
        {admin ? null : <AnalyticsListener />}
        {admin ? null : <ConsentNotice />}
      </body>
    </html>
  );
}
