import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCateringMailto,
  cateringSubject,
  todayISO,
  validateCateringInquiry,
  type CateringInquiry,
} from './catering-inquiry.ts';

const today = '2026-10-09';

const valid: CateringInquiry = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '713-555-0100',
  eventType: 'Corporate Event',
  date: '2026-11-02',
  guests: '20',
  location: 'Houston',
  details: 'Korean BBQ bowls and lemonade.',
};

test('requires the catering fields that cannot be blank', () => {
  const errors = validateCateringInquiry(
    { name: ' ', email: '', phone: '', eventType: '', date: '', guests: '', location: '  ', details: '' },
    today,
  );
  assert.equal(errors.name, 'Enter your full name.');
  assert.equal(errors.email, 'Enter your email address.');
  assert.equal(errors.eventType, 'Choose an event type.');
  assert.equal(errors.date, 'Choose an event date.');
  assert.equal(errors.guests, 'Enter the estimated guest count.');
  assert.equal(errors.location, 'Enter the event location.');
  assert.equal(errors.phone, undefined);
  assert.equal(errors.details, undefined);
});

test('rejects an invalid email address', () => {
  const errors = validateCateringInquiry({ ...valid, email: 'alex@example' }, today);
  assert.equal(errors.email, 'Enter a valid email address.');
});

test('rejects a past event date and accepts today', () => {
  assert.equal(validateCateringInquiry({ ...valid, date: '2026-10-08' }, today).date, 'Event date cannot be in the past.');
  assert.equal(validateCateringInquiry({ ...valid, date: today }, today).date, undefined);
});

test('rejects zero, negative, and decimal guest counts', () => {
  for (const guests of ['0', '-3', '1.5', '20.0']) {
    assert.equal(
      validateCateringInquiry({ ...valid, guests }, today).guests,
      'Enter a positive whole number of guests.',
      guests,
    );
  }
  assert.equal(validateCateringInquiry({ ...valid, guests: '12' }, today).guests, undefined);
});

test('builds a mailto link with every field, the recipient, and the subject', () => {
  const href = buildCateringMailto(valid, 'info@fluffysbistro.com');
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'info@fluffysbistro.com');
  assert.equal(url.searchParams.get('subject'), cateringSubject);
  const body = url.searchParams.get('body') ?? '';
  assert.match(body, /Name: Alex Rivera/);
  assert.match(body, /Email: alex@example.com/);
  assert.match(body, /Phone: 713-555-0100/);
  assert.match(body, /Event type: Corporate Event/);
  assert.match(body, /Event date: 2026-11-02/);
  assert.match(body, /Guests: 20/);
  assert.match(body, /Location: Houston/);
  assert.match(body, /Event details: Korean BBQ bowls and lemonade/);
  assert.doesNotMatch(body, /received|submitted successfully|inquiry has been/i);
});

test('keeps optional phone and details labeled when they are blank', () => {
  const body = new URL(buildCateringMailto({ ...valid, phone: ' ', details: '' }, 'info@fluffysbistro.com')).searchParams.get(
    'body',
  );
  assert.match(body ?? '', /Phone: Not specified/);
  assert.match(body ?? '', /Event details: Not specified/);
});

test('formats the local date without a timezone shift', () => {
  assert.equal(todayISO(new Date(2026, 9, 9, 23, 30)), '2026-10-09');
});
