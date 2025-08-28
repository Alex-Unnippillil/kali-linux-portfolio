import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { contactSchema } from '../../../utils/contactSchema';

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));

const errorMap: Record<string, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  invalid_csrf: 'Security token mismatch. Refresh and retry.',
  invalid_recaptcha: 'Captcha verification failed. Please try again.',
};

export const processContactForm = async (
  data: {
    name: string;
    email: string;
    message: string;
    honeypot: string;
    csrfToken: string;
    recaptchaToken: string;
  },
  fetchImpl: typeof fetch = fetch
) => {
  try {
    const parsed = contactSchema.parse(data);
    const res = await fetchImpl('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': parsed.csrfToken,
      },
      body: JSON.stringify({
        name: sanitize(parsed.name),
        email: parsed.email,
        message: sanitize(parsed.message),
        honeypot: parsed.honeypot,
        recaptchaToken: parsed.recaptchaToken,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorMap[body.code as string] || 'Submission failed',
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Submission failed' };
  }
};

const ContactApp = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/input-hub?preset=contact');
  }, [router]);
  return null;
};

export default ContactApp;

