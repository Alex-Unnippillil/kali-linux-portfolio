import React, { useEffect, useState } from 'react';
import FormError from '../../ui/FormError';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetch('/api/contact')
      .then((res) => res.json())
      .then((d) => setCsrfToken(d.csrfToken || ''))
      .catch(() => {});
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const recaptchaToken = await new Promise<string>((resolve) => {
      const g: any = (window as any).grecaptcha;
      if (!g || !siteKey) return resolve('');
      g.ready(() => {
        g.execute(siteKey, { action: 'submit' })
          .then((token: string) => resolve(token))
          .catch(() => resolve(''));
      });
    });
    const result = await processContactForm({
      name,
      email,
      message,
      honeypot,
      csrfToken,
      recaptchaToken,
    });
    if (!result.success) {
      setError(result.error ? sanitize(result.error) : 'Submission failed');
      setSuccess(false);
    } else {
      setError('');
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="p-4 text-black">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          className="p-1 border"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="p-1 border"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <textarea
          className="p-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          Send
        </button>
      </form>
      {error && <FormError>{error}</FormError>}
      {success && !error && (
        <div role="status" className="text-green-600 mt-2">
          Message sent!
        </div>
      )}
    </div>
  );
};

export default ContactApp;

