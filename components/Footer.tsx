import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { photoCredits } from '@/lib/data';
import { getContact } from '@/lib/public-content';

const icons = {
  Instagram,
  Facebook,
};

export default async function Footer() {
  const contact = await getContact();
  const socials = [
    { name: 'Instagram', href: contact.instagram },
    { name: 'Facebook', href: contact.facebook },
  ];
  const orders = [
    { name: 'DoorDash', href: contact.doordash, provider: 'doordash' },
    { name: 'Uber Eats', href: contact.uberEats, provider: 'uber-eats' },
    { name: 'Grubhub', href: contact.grubhub, provider: 'grubhub' },
  ].filter((order) => order.href);
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <Link className="brand" href="/">
              <BrandLogo className="brand-logo footer-logo" />
            </Link>
            <p>Cajun Asian Fusion. Fun, flavor, and freshness on the move.</p>
          </div>
          <div>
            <strong>Explore</strong>
            <Link href="/">Home</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/catering">Catering</Link>
            <Link href="/about">About</Link>
            <Link href="/find-us">Find Us</Link>
          </div>
          <div>
            <strong>Get in touch</strong>
            <a href={contact.phoneHref} aria-label={`Call ${contact.phoneDisplay}`} data-track="phone_click">
              {contact.phoneDisplay}
            </a>
            {orders.map((order) => (
              <a key={order.provider} href={order.href} target="_blank" rel="noopener noreferrer" data-track="order_link_click" data-provider={order.provider}>
                {order.name}
              </a>
            ))}
            <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.email}`}>
              {contact.email}
            </a>
            <div className="social-row">
              {socials.map((social) => {
                const Icon = icons[social.name as keyof typeof icons];
                return (
                  <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer">
                    <Icon size={18} aria-hidden="true" />
                    {social.name}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="photo-credits">
            {photoCredits.note} Bowl, seafood, lemonade, rice, and the catering spread via{' '}
            <a href={photoCredits.unsplashHref} target="_blank" rel="noopener noreferrer">
              Unsplash
            </a>
            .{' '}
            <a href={photoCredits.funnel.href} target="_blank" rel="noopener noreferrer">
              Funnel cake
            </a>{' '}
            by{' '}
            <a href={photoCredits.funnel.authorHref} target="_blank" rel="noopener noreferrer">
              {photoCredits.funnel.author}
            </a>
            ,{' '}
            <a href={photoCredits.funnel.licenseHref} rel="license noopener noreferrer" target="_blank">
              {photoCredits.funnel.license}
            </a>
            .{' '}
            <a href={photoCredits.poboy.href} target="_blank" rel="noopener noreferrer">
              Shrimp po&apos;boy
            </a>{' '}
            by{' '}
            <a href={photoCredits.poboy.authorHref} target="_blank" rel="noopener noreferrer">
              {photoCredits.poboy.author}
            </a>
            ,{' '}
            <a href={photoCredits.poboy.licenseHref} rel="license noopener noreferrer" target="_blank">
              {photoCredits.poboy.license}
            </a>
            .
          </p>
          <div className="footer-meta">
            <span>© {new Date().getFullYear()} Fluffy&apos;s Bistro. All rights reserved.</span>
            <span>Weekly stops are posted on Instagram.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
