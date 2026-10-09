import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { contact, socials } from '@/lib/data';

const icons = {
  Instagram,
  Facebook,
};

export default function Footer() {
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
            <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
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
          <span>© {new Date().getFullYear()} Fluffy&apos;s Bistro. All rights reserved.</span>
          <span>Weekly stops are posted on Instagram.</span>
        </div>
      </div>
    </footer>
  );
}
