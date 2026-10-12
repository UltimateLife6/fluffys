import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { defaultSiteContent } from '@/lib/admin/site-defaults';
import { getContact, getPublicSite, getPublicStops } from '@/lib/public-content';

export const metadata: Metadata = {
  title: {
    absolute: "Find Fluffy's Bistro | Food Truck Schedule",
  },
  description:
    "Fluffy's Bistro has not published a street address or hours. The weekly food truck schedule is posted on Instagram.",
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: '/find-us' } } : {}),
  openGraph: {
    title: "Find Fluffy's Bistro | Food Truck Schedule",
    description:
      "Fluffy's Bistro has not published a street address or hours. The weekly food truck schedule is posted on Instagram.",
  },
  twitter: {
    title: "Find Fluffy's Bistro | Food Truck Schedule",
    description:
      "Fluffy's Bistro has not published a street address or hours. The weekly food truck schedule is posted on Instagram.",
  },
};

const icons = {
  Instagram,
  Facebook,
};

export default async function FindUs() {
  const contact = await getContact();
  const socialLinks = [
    { name: 'Instagram', href: contact.instagram },
    { name: 'Facebook', href: contact.facebook },
  ];
  const site = await getPublicSite();
  const stops = (await getPublicStops()) as {
    id: string;
    name: string;
    address: string;
    starts_at: string;
    ends_at: string;
    hours: string;
  }[];
  return (
    <>
      <PageHeader kicker="Follow the flavor" title="Catch us out there.">
        We&apos;re on the move. Check back for the next confirmed stop.
      </PageHeader>
      <section className="shell find-layout">
        <div className="location-panel">
          <MapPin size={40} aria-hidden="true" />
          <p className="kicker">Up next</p>
          <h2 id="stop-details">{stops.length ? 'Upcoming stops' : 'New location coming soon.'}</h2>
          {stops.length ? (
            <ul className="stop-list">
              {stops.map((stop) => (
                <li key={stop.id}>
                  <a href="#stop-details" data-track="truck_location_click" data-stop-id={stop.id}>
                    <strong>{stop.name}</strong>
                  </a>
                  <span>{stop.address}</span>
                  <span>
                    {stop.starts_at.replace('T', ' ')} – {stop.ends_at.replace('T', ' ')}
                  </span>
                  {stop.hours ? <span>{stop.hours}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <strong>No confirmed appearances yet</strong>
              <p>
                {site.hoursNote === defaultSiteContent.hoursNote
                  ? "A public address, hours, and upcoming stops are not listed until Fluffy's confirms them. The weekly schedule is posted on Instagram."
                  : site.hoursNote}
              </p>
            </div>
          )}
          <a className="button primary" href={contact.instagram} target="_blank" rel="noopener noreferrer">
            <Instagram size={18} aria-hidden="true" /> Instagram schedule
          </a>
        </div>
        <div className="find-details">
          <h2>Stay in the loop.</h2>
          <p>Reach out directly for the latest details, or send a catering request for your event.</p>
          <a className="contact-option" href={contact.phoneHref} aria-label={`Call ${contact.phoneDisplay}`} data-track="phone_click">
            <Phone size={20} aria-hidden="true" />
            {contact.phoneDisplay}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="contact-option" href={`mailto:${contact.email}`} aria-label={`Email ${contact.email}`}>
            <Mail size={20} aria-hidden="true" />
            {contact.email}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          {socialLinks.map((social) => {
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
