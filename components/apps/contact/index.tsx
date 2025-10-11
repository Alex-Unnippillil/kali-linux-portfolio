'use client';

import React, { useEffect, useState } from 'react';
import { ZodError } from 'zod';
import FormError from '../../ui/FormError';
import { copyToClipboard } from '../../../utils/clipboard';
import { openMailto } from '../../../utils/mailto';
import { contactSchema } from '../../../utils/contactSchema';
import AttachmentUploader, {
  MAX_TOTAL_ATTACHMENT_SIZE,
} from '../../../apps/contact/components/AttachmentUploader';
import AttachmentCarousel from '../../../apps/contact/components/AttachmentCarousel';

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));

const CONTACT_ENDPOINT =
  process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || '/api/dummy';

export const CONTACT_OFFLINE_ERROR =
  'Network unavailable. Copy your message or try email instead.';

const errorMap: Record<string, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  network_error: CONTACT_OFFLINE_ERROR,
  offline: CONTACT_OFFLINE_ERROR,
};

type ContactFormData = {
  name: string;
  email: string;
  message: string;
  honeypot?: string;
};

type ContactFormResult = {
  success: boolean;
  error?: string;
  code?: string;
};

const clientSchema = contactSchema.omit({
  csrfToken: true,
  recaptchaToken: true,
});

export const processContactForm = async (
  data: ContactFormData,
  fetchImpl: typeof fetch = fetch,
): Promise<ContactFormResult> => {
  if (
    typeof navigator !== 'undefined' &&
    'onLine' in navigator &&
    !navigator.onLine
  ) {
    return { success: false, error: CONTACT_OFFLINE_ERROR, code: 'offline' };
  }

  let parsed: ContactFormData & { honeypot: string };
  try {
    parsed = clientSchema.parse({ ...data, honeypot: data.honeypot ?? '' });
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'Please check your input and try again.',
        code: 'invalid_input',
      };
    }
    return { success: false, error: 'Submission failed' };
  }

  if (parsed.honeypot) {
    return {
      success: false,
      error: 'Submission blocked',
      code: 'honeypot',
    };
  }

  let response: Response;
  try {
    response = await fetchImpl(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sanitize(parsed.name),
        email: parsed.email,
        message: sanitize(parsed.message),
      }),
    });
  } catch {
    return {
      success: false,
      error: CONTACT_OFFLINE_ERROR,
      code: 'network_error',
    };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : undefined;
    const errorMessage =
      (code && errorMap[code]) ||
      (typeof body.message === 'string' ? body.message : 'Submission failed');
    return {
      success: false,
      error: errorMessage,
      code,
    };
  }

  return { success: true };
};

const DRAFT_FILE = 'contact-draft.json';
const EMAIL = 'alex.unnippillil@hotmail.com';

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

const uploadAttachments = async (files: File[]) => {
  if (!files.length) return;
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  try {
    await fetch('/api/contact/attachments', {
      method: 'POST',
      body: form,
    });
  } catch {
    /* ignore */
  }
};

const ContactApp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const updateFallback = () => {
      const shouldFallback =
        typeof navigator !== 'undefined' &&
        'onLine' in navigator &&
        !navigator.onLine;
      setFallback(shouldFallback);
    };

    updateFallback();
    window.addEventListener('online', updateFallback);
    window.addEventListener('offline', updateFallback);
    return () => {
      window.removeEventListener('online', updateFallback);
      window.removeEventListener('offline', updateFallback);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const draft = await readDraft();
      if (draft) {
        setName(draft.name || '');
        setEmail(draft.email || '');
        setMessage(draft.message || '');
      }
    })();
  }, []);

  useEffect(() => {
    void writeDraft({ name, email, message });
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setBanner(null);
    setEmailError('');
    setMessageError('');
    setNameError('');

    const emailResult = contactSchema.shape.email.safeParse(email);
    const messageResult = contactSchema.shape.message.safeParse(message);
    const nameResult = contactSchema.shape.name.safeParse(name);
    let hasValidationError = false;
    if (!nameResult.success) {
      setNameError('1-100 chars');
      hasValidationError = true;
    }
    if (!emailResult.success) {
      setEmailError('Invalid email');
      hasValidationError = true;
    }
    if (!messageResult.success) {
      setMessageError('1-1000 chars');
      hasValidationError = true;
    }
    if (hasValidationError) {
      setBanner({ type: 'error', message: 'Failed to send' });
      setSubmitting(false);
      return;
    }
    const totalSize = attachments.reduce((s, f) => s + f.size, 0);
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      setError(
        `Attachments exceed the ${
          MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)
        }MB total limit.`
      );
      setBanner({ type: 'error', message: 'Failed to send' });
      setSubmitting(false);
      return;
    }
    const result = await processContactForm({
      name,
      email,
      message,
      honeypot,
    });
    if (result.success) {
      setBanner({ type: 'success', message: 'Message sent' });
      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      await uploadAttachments(attachments);
      setAttachments([]);
      void deleteDraft();
    } else {
      const msg = result.error || 'Submission failed';
      setError(msg);
      setBanner({ type: 'error', message: msg });
      if (result.code === 'network_error' || result.code === 'offline') {
        setFallback(true);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="mb-6 text-2xl">Contact</h1>
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-6 rounded p-3 text-sm ${
            banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {banner.message}
        </div>
      )}
      {fallback && (
        <p className="mb-6 text-sm" role="status" aria-live="polite">
          We can&apos;t reach the message service right now. You can{' '}
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
      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        <div className="relative">
          <input
            id="contact-name"
            className="peer w-full rounded border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'contact-name-error' : undefined}
            aria-labelledby="contact-name-label"
            placeholder=" "
          />
          <label
            htmlFor="contact-name"
            id="contact-name-label"
            className="absolute left-3 -top-2 bg-gray-800 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-400"
          >
            Name
          </label>
          {nameError && (
            <FormError id="contact-name-error" className="mt-3">
              {nameError}
            </FormError>
          )}
        </div>
        <div className="relative">
          <input
            id="contact-email"
            type="email"
            className="peer w-full rounded border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'contact-email-error' : undefined}
            aria-labelledby="contact-email-label"
            placeholder=" "
          />
          <label
            htmlFor="contact-email"
            id="contact-email-label"
            className="absolute left-3 -top-2 bg-gray-800 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-400"
          >
            Email
          </label>
          {emailError && (
            <FormError id="contact-email-error" className="mt-3">
              {emailError}
            </FormError>
          )}
        </div>
        <div className="relative">
          <textarea
            id="contact-message"
            className="peer w-full rounded border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            aria-invalid={!!messageError}
            aria-describedby={messageError ? 'contact-message-error' : undefined}
            aria-labelledby="contact-message-label"
            placeholder=" "
          />
          <label
            htmlFor="contact-message"
            id="contact-message-label"
            className="absolute left-3 -top-2 bg-gray-800 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-400"
          >
            Message
          </label>
          {messageError && (
            <FormError id="contact-message-error" className="mt-3">
              {messageError}
            </FormError>
          )}
        </div>
        <AttachmentUploader
          attachments={attachments}
          setAttachments={setAttachments}
          onError={setError}
        />
        <AttachmentCarousel
          attachments={attachments}
          onRemove={(i) =>
            setAttachments((prev) => prev.filter((_, idx) => idx !== i))
          }
        />
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        {error && <FormError className="mt-3">{error}</FormError>}
        <p
          id="contact-privacy"
          className="text-xs text-gray-400"
        >
          By submitting, you agree that we may use your name and email solely
          to respond to this inquiry. Messages stay within this portfolio
          environment and aren&apos;t sent to external services.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center rounded bg-blue-600 px-4 py-2 disabled:opacity-50"
        >
          {submitting ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
};

export default ContactApp;

