export const eventTypes = [
  'Birthday Party',
  'Wedding',
  'Corporate Event',
  'Graduation',
  'Family Gathering',
  'Festival / Community Event',
  'Other',
] as const;

export type EventType = (typeof eventTypes)[number];

export type CateringInquiry = {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  date: string;
  guests: string;
  location: string;
  details: string;
};

export type CateringField = keyof CateringInquiry;
export type FieldErrors = Partial<Record<CateringField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const guestPattern = /^[1-9]\d*$/;

export function todayISO(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function validateCateringInquiry(input: CateringInquiry, today = todayISO()): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.name.trim()) errors.name = 'Enter your full name.';

  if (!input.email.trim()) errors.email = 'Enter your email address.';
  else if (!emailPattern.test(input.email.trim())) errors.email = 'Enter a valid email address.';

  if (!input.eventType) errors.eventType = 'Choose an event type.';

  if (!input.date) errors.date = 'Choose an event date.';
  else if (input.date < today) errors.date = 'Event date cannot be in the past.';

  if (!input.guests.trim()) errors.guests = 'Enter the estimated guest count.';
  else if (!guestPattern.test(input.guests.trim())) errors.guests = 'Enter a positive whole number of guests.';

  if (!input.location.trim()) errors.location = 'Enter the event location.';

  return errors;
}

export const cateringSubject = "Fluffy's Bistro Catering Inquiry";

export function buildCateringMailto(input: CateringInquiry, recipient: string) {
  const lines = [
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim()}`,
    `Phone: ${input.phone.trim() || 'Not specified'}`,
    `Event type: ${input.eventType}`,
    `Event date: ${input.date}`,
    `Guests: ${input.guests.trim()}`,
    `Location: ${input.location.trim()}`,
    `Event details: ${input.details.trim() || 'Not specified'}`,
  ];
  const subject = encodeURIComponent(cateringSubject);
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}
