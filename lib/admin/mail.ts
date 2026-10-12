export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type MailResult = {
  status: 'pending' | 'sent' | 'failed';
  accepted: boolean;
  transient: boolean;
  error: string;
};

export function mailProvider() {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'resend' && process.env.RESEND_API_KEY) return 'resend';
  if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (provider === 'mock') return 'mock';
  return 'unconfigured';
}

export async function sendRestaurantEmail(message: MailMessage): Promise<MailResult> {
  const provider = mailProvider();
  if (provider === 'unconfigured') {
    return { status: 'pending', accepted: false, transient: false, error: '' };
  }
  if (provider === 'mock') {
    if (process.env.EMAIL_MOCK_MODE === 'sent') return { status: 'sent', accepted: true, transient: false, error: '' };
    const transient = process.env.EMAIL_MOCK_MODE !== 'permanent';
    return { status: 'failed', accepted: false, transient, error: 'Mock email provider did not accept the message.' };
  }
  try {
    const response =
      provider === 'resend'
        ? await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM,
              to: message.to,
              subject: message.subject,
              text: message.text,
            }),
            signal: AbortSignal.timeout(8000),
          })
        : await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: message.to }] }],
              from: { email: process.env.EMAIL_FROM },
              subject: message.subject,
              content: [{ type: 'text/plain', value: message.text }],
            }),
            signal: AbortSignal.timeout(8000),
          });
    if (response.ok) return { status: 'sent', accepted: true, transient: false, error: '' };
    const transient = response.status === 429 || response.status >= 500;
    return { status: 'failed', accepted: false, transient, error: `Email provider returned ${response.status}.` };
  } catch {
    return { status: 'failed', accepted: false, transient: true, error: 'Email provider could not be reached.' };
  }
}
