import type { Metadata } from 'next';
import { getPublicPackages } from '@/lib/public-content';

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

export default async function CateringLayout({ children }: { children: React.ReactNode }) {
  const packages = (await getPublicPackages()) as { id: string; name: string; description: string; pricing_note: string }[];
  return (
    <>
      {children}
      {packages.length ? (
        <section className="section shell">
          <h2>Catering packages</h2>
          <div className="benefit-grid">
            {packages.map((item) => (
              <article className="benefit" key={item.id}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.pricing_note ? <p>{item.pricing_note}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
