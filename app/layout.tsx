import type { Metadata } from 'next';
import { Fredoka, Nunito, Pacifico } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${script.variable}`}>
      <body>
        <Header />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
