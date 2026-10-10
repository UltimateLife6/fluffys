import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catering',
  description:
    "Ask Fluffy's Bistro about catering for a party, celebration, or company gathering. The form prepares an email and nothing is sent until you send it.",
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: '/catering' } } : {}),
  openGraph: {
    title: "Catering | Fluffy's Bistro",
    description:
      "Ask Fluffy's Bistro about catering for a party, celebration, or company gathering. The form prepares an email and nothing is sent until you send it.",
  },
  twitter: {
    title: "Catering | Fluffy's Bistro",
    description:
      "Ask Fluffy's Bistro about catering for a party, celebration, or company gathering. The form prepares an email and nothing is sent until you send it.",
  },
};

export default function CateringLayout({ children }: { children: React.ReactNode }) {
  return children;
}
