'use client';

import React, { useEffect, useState } from 'react';
import Toast from '../../ui/Toast';
import { copyToClipboard } from '../../../utils/clipboard';
import { openMailto } from '../../../utils/mailto';
import { contactSchema } from '../../../utils/contactSchema';
import usePersistentState from '../../../hooks/usePersistentState';
import ErrorBanner from '../../../apps/contact/components/ErrorBanner';
import errorMap from '../../../apps/contact/utils/errorMap';

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));

export const processContactForm = async (
  data: {
    name: string;
    email: string;
    message: string;
    honeypot: string;
    csrfToken: string;
    recaptchaToken: string;
  },
  fetchImpl: typeof fetch = fetch,
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
      const code: string | number = body.code ?? res.status;
      return {
        success: false,
        code,
        error: errorMap[code] || 'Submission failed',
      };
    }
    return { success: true };
  } catch {
    return { success: false, code: 'network_error', error: 'Submission failed' };
  }
};

const DRAFT_FILE = 'contact-draft.json';
const EMAIL = 'alex.unnippillil@hotmail.com';

const getRecaptchaToken = (siteKey: string): Promise<string> =>
  new Promise((resolve) => {
    const g: any = (window as any).grecaptcha;
    if (!g || !siteKey) return resolve('');
    g.ready(() => {
      g
        .execute(siteKey, { action: 'submit' })
        .then((token: string) => resolve(token))
        .catch(() => resolve(''));
    });
  });

const writeDraft = async (draft: {
  name: string;
  email: string;
  message: string;
}) => {
  try {
    const dir = await (navigator as any).storage?.getDirectory?.();
    if (!dir) return;
    const handle = await dir.getFileHandle(DRAFT_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(draft));
    await writable.close();
  } catch {
    /* ignore */
  }
};

const readDraft = async () => {
  try {
    const dir = await (navigator as any).storage?.getDirectory?.();
    if (!dir) return null;
    const handle = await dir.getFileHandle(DRAFT_FILE);
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const deleteDraft = async () => {
  try {
    const dir = await (navigator as any).storage?.getDirectory?.();
    if (!dir) return;
    await dir.removeEntry(DRAFT_FILE);
  } catch {
    /* ignore */
  }
};

const ContactApp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errorCode, setErrorCode] = useState<string | number | null>(null);
  const [toast, setToast] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [fallback, setFallback] = useState(false);
  const [retryCount, setRetryCount] = usePersistentState<number>(
    'contact-retry-count',
    0,
    (v): v is number => typeof v === 'number'
  );

  useEffect(() => {
    (async () => {
      const draft = await readDraft();
      if (draft) {
        setName(draft.name || '');
        setEmail(draft.email || '');
        setMessage(draft.message || '');
      }
    })();
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute('content') || '');
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    if (!siteKey || !(window as any).grecaptcha) {
      setFallback(true);
    }
  }, []);

  useEffect(() => {
    void writeDraft({ name, email, message });
  }, [name, email, message]);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCode(null);
    let recaptchaToken = '';
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    let shouldFallback = fallback;
    if (!shouldFallback && siteKey && (window as any).grecaptcha) {
      recaptchaToken = await getRecaptchaToken(siteKey);
      if (!recaptchaToken) shouldFallback = true;
    } else {
      shouldFallback = true;
    }
    if (shouldFallback) {
      setFallback(true);
      setErrorCode(503);
      setToast('Failed to send');
      return;
    }

    const attemptSend = async (attempt: number): Promise<void> => {
      const result = await processContactForm({
        name,
        email,
        message,
        honeypot,
        csrfToken,
        recaptchaToken,
      });
      if (result.success) {
        setToast('Message sent');
        setName('');
        setEmail('');
        setMessage('');
        setHoneypot('');
        setRetryCount(0);
        setErrorCode(null);
        void deleteDraft();
      } else {
        setErrorCode(result.code ?? 'unknown');
        setToast('Failed to send');
        if (
          result.error?.toLowerCase().includes('captcha') ||
          result.error === 'Submission failed'
        ) {
          setFallback(true);
        }
        if (attempt < 3) {
          setRetryCount((r) => r + 1);
          const wait = Math.min(1000 * 2 ** attempt, 30000);
          await delay(wait);
          await attemptSend(attempt + 1);
        }
      }
    };

    await attemptSend(0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="mb-4 text-2xl">Contact</h1>
      {fallback && (
        <p className="mb-4 text-sm">
          Service unavailable. You can{' '}
          <button
            type="button"
            onClick={() => copyToClipboard(EMAIL)}
            className="underline mr-2"
          >
            Copy address
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(message)}
            className="underline mr-2"
          >
            Copy message
          </button>
          <button
            type="button"
            onClick={() => openMailto(EMAIL, '', message)}
            className="underline"
          >
            Open email app
          </button>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-sm">Name</label>
          <input
            id="contact-name"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1 block text-sm">Email</label>
          <input
            id="contact-email"
            type="email"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-1 block text-sm">Message</label>
          <textarea
            id="contact-message"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />
        {errorCode && (
          <ErrorBanner code={errorCode} onClose={() => setErrorCode(null)} />
        )}
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2"
        >
          Send
        </button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default ContactApp;

