import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { contact, socials } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Find Us',
  description:
    "Find Fluffy's Bistro food truck stops, phone, email, and social pages. The weekly schedule is posted on Instagram.",
};

const icons = {
  Instagram,
  Facebook,
};

export default function FindUs() {
  return (
    <>
      <PageHeader kicker="Follow the flavor" title="Catch us out there.">
        We&apos;re on the move. Check back for the next confirmed stop.
      </PageHeader>
      <section className="shell find-layout">
        <div className="location-panel">
          <MapPin size={40} aria-hidden="true" />
          <p className="kicker">Up next</p>
          <h2>New location coming soon.</h2>
          <div className="empty-state">
            <strong>No confirmed appearances yet</strong>
            <p>
              A public address, hours, and upcoming stops are not listed until Fluffy&apos;s confirms them. Please check
              Instagram for the weekly schedule.
            </p>
          </div>
        </div>
        <div className="find-details">
          <h2>Stay in the loop.</h2>
          <p>Reach out directly for the latest details, or send a catering request for your event.</p>
          <a className="contact-option" href={contact.phoneHref}>
            <Phone size={20} aria-hidden="true" />
            {contact.phoneDisplay}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="contact-option" href={`mailto:${contact.email}`}>
            <Mail size={20} aria-hidden="true" />
            {contact.email}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          {socials.map((social) => {
            const Icon = icons[social.name as keyof typeof icons];
            return (
              <a className="contact-option" href={social.href} target="_blank" rel="noopener noreferrer" key={social.href}>
                <Icon size={20} aria-hidden="true" />
                {social.name}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            );
          })}
          <Link href="/catering" className="button primary">
            Book us for an event <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
