'use client';

import Image from 'next/image';
import { cloneElement, type FocusEvent, type FormEvent, type ReactElement, useEffect, useState } from 'react';
import { ArrowRight, Calendar, Mail, Phone, UtensilsCrossed } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import {
  buildCateringMailto,
  eventTypes,
  todayISO,
  validateCateringInquiry,
  type CateringField,
  type CateringInquiry,
  type FieldErrors,
} from '@/lib/catering-inquiry';
import { contact, photos } from '@/lib/data';

const benefits = [
  {
    title: 'Familiar favorites',
    text: "Korean BBQ bowls, Cajun seafood, po'boys, funnel cakes, and lemonades from the regular menu.",
    icon: UtensilsCrossed,
  },
  {
    title: 'Your event details',
    text: 'Share the date, guest count, location, and the dishes you have in mind.',
    icon: Calendar,
  },
  {
    title: 'Email inquiry',
    text: 'This form opens your email app with a prefilled message. Nothing is sent until you send that email.',
    icon: Mail,
  },
];

const fieldOrder: CateringField[] = ['name', 'email', 'phone', 'eventType', 'date', 'guests', 'location', 'details'];

function readInquiry(form: HTMLFormElement): CateringInquiry {
  const data = new FormData(form);
  return {
    name: String(data.get('name') ?? ''),
    email: String(data.get('email') ?? ''),
    phone: String(data.get('phone') ?? ''),
    eventType: String(data.get('eventType') ?? ''),
    date: String(data.get('date') ?? ''),
    guests: String(data.get('guests') ?? ''),
    location: String(data.get('location') ?? ''),
    details: String(data.get('details') ?? ''),
  };
}

function openMailto(url: string) {
  return new Promise<boolean>((resolve) => {
    let handedOff = false;
    const mark = () => {
      handedOff = true;
    };
    window.addEventListener('blur', mark);
    document.addEventListener('visibilitychange', mark);
    window.location.href = url;
    window.setTimeout(() => {
      window.removeEventListener('blur', mark);
      document.removeEventListener('visibilitychange', mark);
      resolve(handedOff || document.hidden);
    }, 1200);
  });
}

export default function Catering() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [mailtoFailed, setMailtoFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(todayISO());
  }, []);

  function blurField(event: FocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    const field = target.name as CateringField;
    if (!fieldOrder.includes(field)) return;
    const next = validateCateringInquiry(readInquiry(event.currentTarget));
    setErrors((current) => ({ ...current, [field]: next[field] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const inquiry = readInquiry(form);
    const next = validateCateringInquiry(inquiry);
    setErrors(next);
    const firstInvalid = fieldOrder.find((field) => next[field]);
    if (firstInvalid) {
      const control = form.elements.namedItem(firstInvalid);
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setMailtoFailed(false);
    setOpening(true);
    const opened = await openMailto(buildCateringMailto(inquiry, contact.email));
    setOpening(false);
    if (!opened) setMailtoFailed(true);
  }

  return (
    <>
      <PageHeader kicker="Let's celebrate" title="Catering done right.">
        Big events deserve big flavor. Tell us what you&apos;re planning.
      </PageHeader>

      <section className="section shell">
        <div className="benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="benefit" key={benefit.title}>
                <Icon aria-hidden="true" />
                <h2>{benefit.title}</h2>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>

        <div className="catering-layout">
          <div className="catering-aside">
            <div className="catering-photo">
              <Image
                src={photos.catering}
                alt="Illustrative photo of a buffet with several dishes arranged for a gathering"
                fill
                sizes="(max-width: 800px) 100vw, 40vw"
              />
            </div>
            <h2>Let&apos;s make it memorable.</h2>
            <p>
              From family celebrations to company gatherings, we&apos;d love to hear about your event. Share the details
              and we&apos;ll take it from there.
            </p>
            <a className="contact-option" href={contact.phoneHref} aria-label={`Call ${contact.phoneDisplay}`}>
              <Phone size={20} aria-hidden="true" />
              {contact.phoneDisplay}
            </a>
            <a className="contact-option" href={`mailto:${contact.email}`} aria-label={`Email ${contact.email}`}>
              <Mail size={20} aria-hidden="true" />
              {contact.email}
            </a>
          </div>

          <form className="catering-form" noValidate onSubmit={submit} onBlur={blurField}>
            <div className="form-row">
              <Field label="Full name" name="name" error={errors.name} required>
                <input name="name" autoComplete="name" required aria-invalid={Boolean(errors.name)} placeholder="Full name" />
              </Field>
              <Field label="Email address" name="email" error={errors.email} required>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                  placeholder="you@example.com"
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Phone number" name="phone" error={errors.phone}>
                <input name="phone" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} placeholder="(555) 000-0000" />
              </Field>
              <Field label="Event type" name="eventType" error={errors.eventType} required>
                <select name="eventType" required defaultValue="" aria-invalid={Boolean(errors.eventType)}>
                  <option value="" disabled>
                    Choose an event type
                  </option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label="Event date" name="date" error={errors.date} required>
                <input name="date" type="date" required min={today || undefined} aria-invalid={Boolean(errors.date)} />
              </Field>
              <Field label="Estimated guests" name="guests" error={errors.guests} required>
                <input
                  name="guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  aria-invalid={Boolean(errors.guests)}
                  placeholder="Number of guests"
                />
              </Field>
            </div>
            <Field label="Event location" name="location" error={errors.location} required>
              <input name="location" required aria-invalid={Boolean(errors.location)} placeholder="City or venue" />
            </Field>
            <Field label="Additional event details" name="details" error={errors.details}>
              <textarea
                name="details"
                rows={5}
                aria-invalid={Boolean(errors.details)}
                placeholder="Menu interests, dietary needs, and anything else we should know."
              />
            </Field>
            <button className="button primary" type="submit" disabled={opening} aria-busy={opening} aria-describedby="catering-email-help">
              Prepare Catering Inquiry <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className="form-hint" id="catering-email-help">
              Your email app will open with your event details. Please send the email to complete your inquiry.
            </p>
            {mailtoFailed ? (
              <p className="form-fallback" role="alert">
                Your email app did not open. Email{' '}
                <a href={`mailto:${contact.email}`}>{contact.email}</a> or call{' '}
                <a href={contact.phoneHref}>{contact.phoneDisplay}</a> with your event details.
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  error,
  required = false,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: ReactElement<{ 'aria-describedby'?: string; 'aria-required'?: boolean }>;
}) {
  const errorId = `${name}-error`;
  const control = cloneElement(children, {
    'aria-describedby': error ? errorId : undefined,
    'aria-required': required || undefined,
  });
  return (
    <label>
      <span>
        {label}
        {required ? (
          <abbr className="required-mark" title="required">
            *
          </abbr>
        ) : null}
      </span>
      {control}
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
