import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Catering',
  description:
    "Ask Fluffy's Bistro about catering for a party, celebration, or company gathering. The inquiry form opens your email app.",
};

export default function CateringLayout({ children }: { children: React.ReactNode }) {
  return children;
}
