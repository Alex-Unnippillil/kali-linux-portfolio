'use client';

import React, { useCallback, useEffect, useState } from 'react';
import FormError from '../../ui/FormError';
import { copyToClipboard } from '../../../utils/clipboard';
import { openMailto } from '../../../utils/mailto';
import { contactSchema } from '../../../utils/contactSchema';
import {
  clearContactQueue,
  countQueuedContactSubmissions,
  flushContactQueue,
  notifyQueueUpdated,
  prepareContactSubmission,
  queueContactSubmission,
  queueUnavailableMessage,
  registerContactBackgroundSync,
  isQueueSupported,
  ContactSubmissionRequest,
} from '@/services/contactQueue';
import AttachmentUploader, {
  MAX_TOTAL_ATTACHMENT_SIZE,
} from '../../../apps/contact/components/AttachmentUploader';
import AttachmentCarousel from '../../../apps/contact/components/AttachmentCarousel';

const errorMap: Record<string, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  invalid_csrf: 'Security token mismatch. Refresh and retry.',
  invalid_recaptcha: 'Captcha verification failed. Please try again.',
  recaptcha_disabled:
    'Captcha service is not configured. Please use the options above.',
  network_error: 'Network error. Saved for retry when you are back online.',

};
export interface ProcessContactResult {
  success: boolean;
  error?: string;
  code?: string;
  queuedSubmission?: ContactSubmissionRequest;
}

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
): Promise<ProcessContactResult> => {
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: errorMap.invalid_input,
      code: 'invalid_input',
    };
  }

  const submission = prepareContactSubmission(parsed.data);

  try {
    const res = await fetchImpl('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': submission.csrfToken,
      },
      body: JSON.stringify(submission.requestBody),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = (body.code as string) || 'submission_failed';
      return {
        success: false,
        error: errorMap[code] || 'Submission failed',
        code,
      };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      error: errorMap.network_error,
      code: 'network_error',
      queuedSubmission: submission,
    };
  }
};

const DRAFT_FILE = 'contact-draft.json';
const EMAIL = 'alex.unnippillil@hotmail.com';
const SYNC_OPT_IN_KEY = 'contact-sync-opt-in';

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
  const [csrfToken, setCsrfToken] = useState('');
  const [fallback, setFallback] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [queueSupported, setQueueSupported] = useState(false);
  const [hasBackgroundSync, setHasBackgroundSync] = useState(false);
  const [syncOptIn, setSyncOptIn] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [queueNote, setQueueNote] = useState('');

  const refreshQueueCount = useCallback(async () => {
    if (!isQueueSupported()) {
      setPendingCount(0);
      return;
    }
    const count = await countQueuedContactSubmissions();
    setPendingCount(count);
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
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute('content') || '');
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    if (!siteKey || !(window as any).grecaptcha) {
      setFallback(true);
    }
    setQueueSupported(isQueueSupported());
    setHasBackgroundSync(typeof window !== 'undefined' && 'SyncManager' in window);
    const storedOptIn = localStorage.getItem(SYNC_OPT_IN_KEY);
    setSyncOptIn(storedOptIn === 'true');
    void refreshQueueCount();
  }, [refreshQueueCount]);

  useEffect(() => {
    void writeDraft({ name, email, message });
  }, [name, email, message]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (!syncOptIn) return;
      void (async () => {
        await flushContactQueue();
        notifyQueueUpdated();
        await refreshQueueCount();
      })();
    };
    window.addEventListener('online', handler);
    return () => {
      window.removeEventListener('online', handler);
    };
  }, [syncOptIn, refreshQueueCount]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'contact-queue-updated') {
        void refreshQueueCount();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refreshQueueCount]);

  const handleQueueToggle = async () => {
    if (!queueSupported) {
      setQueueNote(queueUnavailableMessage);
      return;
    }
    const next = !syncOptIn;
    setSyncOptIn(next);
    localStorage.setItem(SYNC_OPT_IN_KEY, next ? 'true' : 'false');
    if (next) {
      if (hasBackgroundSync) {
        const registered = await registerContactBackgroundSync();
        if (!registered) {
          setQueueNote(queueUnavailableMessage);
        } else {
          setQueueNote('');
        }
      } else {
        setQueueNote(queueUnavailableMessage);
      }
    } else {
      setQueueNote('');
    }
    await refreshQueueCount();
  };

  const handleClearQueue = async () => {
    await clearContactQueue();
    await refreshQueueCount();
    notifyQueueUpdated();
    setBanner({ type: 'success', message: 'Pending messages cleared' });
  };

  const queueSubmissionForRetry = useCallback(
    async (submission?: ContactSubmissionRequest) => {
      if (!queueSupported || !syncOptIn || !submission) {
        return false;
      }
      const id = await queueContactSubmission(submission);
      if (id === null) {
        return false;
      }
      await refreshQueueCount();
      notifyQueueUpdated();
      if (hasBackgroundSync) {
        const registered = await registerContactBackgroundSync();
        if (!registered) {
          setQueueNote(queueUnavailableMessage);
        } else {
          setQueueNote('');
        }
      } else {
        setQueueNote(queueUnavailableMessage);
      }
      return true;
    },
    [queueSupported, syncOptIn, refreshQueueCount, hasBackgroundSync],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setBanner(null);
    setEmailError('');
    setMessageError('');

    const emailResult = contactSchema.shape.email.safeParse(email);
    const messageResult = contactSchema.shape.message.safeParse(message);
    let hasValidationError = false;
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
      setError('Email service unavailable. Use the options above.');
      setBanner({ type: 'error', message: 'Failed to send' });
      setSubmitting(false);
      return;
    }
    const result = await processContactForm({
      name,
      email,
      message,
      honeypot,
      csrfToken,
      recaptchaToken,
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
      if (result.code === 'network_error') {
        const queued = await queueSubmissionForRetry(result.queuedSubmission);
        if (queued) {
          setBanner({
            type: 'success',
            message: 'Saved offline. We will retry once you are back online.',
          });
          setError('');
          setAttachments([]);
          setHoneypot('');
          void deleteDraft();
          setSubmitting(false);
          return;
        }
      }
      const msg = result.error || 'Submission failed';
      setError(msg);
      setBanner({ type: 'error', message: msg });
      if (
        result.code === 'server_not_configured' ||
        result.error?.toLowerCase().includes('captcha') ||
        result.error === 'Submission failed'
      ) {
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
          className={`mb-6 rounded p-3 text-sm ${
            banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {banner.message}
        </div>
      )}
      {fallback && (
        <p className="mb-6 text-sm">
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
      <section className="mb-6 rounded border border-gray-800 bg-gray-900 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label
              htmlFor="contact-sync-opt-in"
              id="contact-sync-opt-in-label"
              className="font-semibold text-gray-100"
            >
              Retry automatically when online
            </label>
            <p className="mt-1 text-xs text-gray-400" id="contact-sync-opt-in-help">
              Store your message locally and let the service worker resend it when connectivity returns.
            </p>
          </div>
          <input
            id="contact-sync-opt-in"
            type="checkbox"
            className="h-5 w-5 disabled:cursor-not-allowed"
            checked={syncOptIn}
            onChange={() => {
              void handleQueueToggle();
            }}
            aria-describedby="contact-sync-opt-in-help"
            aria-labelledby="contact-sync-opt-in-label"
            disabled={!queueSupported}
            aria-label="Enable automatic retries"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-400">
            {pendingCount === 0
              ? 'No pending messages.'
              : `${pendingCount} pending message${pendingCount === 1 ? '' : 's'}.`}
          </span>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => {
                void handleClearQueue();
              }}
              className="rounded bg-gray-700 px-3 py-1 text-xs text-white transition hover:bg-gray-600"
            >
              Clear pending
            </button>
          )}
        </div>
        {(queueNote || !queueSupported) && (
          <p className="mt-3 text-xs text-yellow-400">
            {queueSupported ? queueNote : queueUnavailableMessage}
          </p>
        )}
      </section>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        <div className="relative">
          <input
            id="contact-name"
            className="peer w-full rounded border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder=" "
            aria-label="Name"
          />
          <label
            htmlFor="contact-name"
            className="absolute left-3 -top-2 bg-gray-800 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-400"
          >
            Name
          </label>
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
            placeholder=" "
            aria-label="Email"
          />
          <label
            htmlFor="contact-email"
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
            placeholder=" "
            aria-label="Message"
          />
          <label
            htmlFor="contact-message"
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

