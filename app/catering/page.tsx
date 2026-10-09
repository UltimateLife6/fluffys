'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { ArrowRight, Mail, Phone, UtensilsCrossed } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { contact, photos } from '@/lib/data';

const benefits = [
  {
    title: 'Familiar favorites',
    text: "Korean BBQ bowls, Cajun seafood, po'boys, funnel cakes, and lemonades from the regular menu.",
  },
  {
    title: 'Your event details',
    text: 'Share the date, guest count, location, and the dishes you have in mind.',
  },
  {
    title: 'Email inquiry',
    text: 'This form opens your email app with a prefilled message. Nothing is sent until you send that email.',
  },
];

export default function Catering() {
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const lines = [
      `Name: ${data.get('name')}`,
      `Email: ${data.get('email')}`,
      `Phone: ${data.get('phone') || 'Not specified'}`,
      `Event date: ${data.get('date') || 'Not specified'}`,
      `Guests: ${data.get('guests') || 'Not specified'}`,
      `Location: ${data.get('location') || 'Not specified'}`,
      `Event details: ${data.get('details') || 'Not specified'}`,
    ];
    const subject = encodeURIComponent("Catering Inquiry — Fluffy's Bistro");
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <>
      <PageHeader kicker="Let's celebrate" title="Catering done right.">
        Big events deserve big flavor. Tell us what you&apos;re planning.
      </PageHeader>

      <section className="section shell">
        <div className="benefit-grid">
          {benefits.map((benefit) => (
            <article className="benefit" key={benefit.title}>
              <UtensilsCrossed aria-hidden="true" />
              <h2>{benefit.title}</h2>
              <p>{benefit.text}</p>
            </article>
          ))}
        </div>

        <div className="catering-layout">
          <div className="catering-aside">
            <div className="catering-photo">
              <Image
                src={photos.hero}
                alt="Illustrative photo of shrimp and rice in a seasoned sauce"
                fill
                sizes="(max-width: 800px) 100vw, 40vw"
              />
            </div>
            <h2>Let&apos;s make it memorable.</h2>
            <p>
              From family celebrations to company gatherings, we&apos;d love to hear about your event. Share the details
              and we&apos;ll take it from there.
            </p>
            <a className="contact-option" href={contact.phoneHref}>
              <Phone size={20} aria-hidden="true" />
              {contact.phoneDisplay}
            </a>
            <a className="contact-option" href={`mailto:${contact.email}`}>
              <Mail size={20} aria-hidden="true" />
              {contact.email}
            </a>
            <p className="catering-note" id="catering-help">
              Submitting this form opens your email app with your event details prefilled. Your request is not sent
              until you send that email.
            </p>
          </div>

          <form className="catering-form" onSubmit={submit} aria-describedby="catering-help">
            <div className="form-row">
              <label>
                Your name *
                <input name="name" required autoComplete="name" placeholder="Full name" />
              </label>
              <label>
                Email address *
                <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Phone number
                <input name="phone" type="tel" autoComplete="tel" placeholder="(555) 000-0000" />
              </label>
              <label>
                Event date
                <input name="date" type="date" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Estimated guests
                <input name="guests" type="number" min={1} placeholder="Number of guests" />
              </label>
              <label>
                Event location
                <input name="location" placeholder="City or venue" />
              </label>
            </div>
            <label>
              Tell us about your event
              <textarea
                name="details"
                rows={6}
                placeholder="Type of event, menu interests, dietary needs, and anything else we should know."
              />
            </label>
            <button className="button primary" type="submit">
              Prepare email inquiry <ArrowRight size={18} aria-hidden="true" />
            </button>
            {sent ? (
              <p role="status" className="form-feedback">
                Your email application should open. Please send the prepared email to complete your inquiry.
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </>
  );
}
