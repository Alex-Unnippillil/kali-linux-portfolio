'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../../ui/FormError';
import { copyToClipboard } from '../../../utils/clipboard';
import { openMailto } from '../../../utils/mailto';
import { contactSchema } from '../../../utils/contactSchema';
import AttachmentUploader, {
  MAX_TOTAL_ATTACHMENT_SIZE,
} from '../../../apps/contact/components/AttachmentUploader';
import AttachmentCarousel from '../../../apps/contact/components/AttachmentCarousel';
import {
  listContactDrafts,
  deleteContactDraft,
  type ContactDraftRecord,
} from '../../../services/contactDraftStorage';

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
  recaptcha_disabled:
    'Captcha service is not configured. Please use the options above.',

};

export interface ContactFormResult {
  success: boolean;
  error?: string;
  code?: string;
  queued?: boolean;
  id?: string;
  queuedAt?: number;
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
): Promise<ContactFormResult> => {
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
    if (res.status === 202) {
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        queued?: boolean;
        queuedAt?: number;
      };
      return {
        success: false,
        queued: true,
        id: body?.id,
        queuedAt: body?.queuedAt,
      };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorMap[body.code as string] || 'Submission failed',
        code: body.code as string,
      };
    }
    return { success: true };
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, queued: true };
    }
    return { success: false, error: 'Submission failed' };
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
    { type: 'success' | 'error' | 'info'; message: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [fallback, setFallback] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [queuedDrafts, setQueuedDrafts] = useState<ContactDraftRecord[]>([]);
  const [showQueuedPrompt, setShowQueuedPrompt] = useState(false);

  const mountedRef = useRef(false);

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

  const refreshQueuedDrafts = useCallback(
    async (forcePrompt = false) => {
      const drafts = await listContactDrafts();
      if (!mountedRef.current) return;
      const sortedDrafts = drafts
        .filter((draft): draft is ContactDraftRecord => Boolean(draft))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setQueuedDrafts(sortedDrafts);
      if (!sortedDrafts.length) {
        setShowQueuedPrompt(false);
        return;
      }
      if (forcePrompt) {
        setShowQueuedPrompt(true);
        return;
      }
      if (typeof navigator === 'undefined' || navigator.onLine) {
        setShowQueuedPrompt(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;
    mountedRef.current = true;
    void refreshQueuedDrafts();

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            id?: string;
            reason?: string;
          }
        | undefined;
      if (!data || data.source !== 'contact-draft-queue') return;
      if (!mountedRef.current) return;

      if (data.type === 'CONTACT_DRAFT_SENT') {
        setBanner({ type: 'success', message: 'Queued message sent successfully.' });
      } else if (data.type === 'CONTACT_DRAFT_FAILED') {
        setBanner({
          type: 'error',
          message: 'Queued message could not be sent automatically. Restore or resend manually.',
        });
        setShowQueuedPrompt(true);
      } else if (data.type === 'CONTACT_DRAFT_QUEUED') {
        setBanner({
          type: 'info',
          message: 'Offline: your message was saved and will send once you reconnect.',
        });
        setShowQueuedPrompt(true);
      } else if (data.type === 'CONTACT_DRAFT_REMOVED') {
        // no-op
      }
      void refreshQueuedDrafts(true);
    };

    const handleOnline = () => {
      void refreshQueuedDrafts(true);
    };

    navigator.serviceWorker?.addEventListener('message', handleSwMessage);
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshQueuedDrafts]);

  const latestQueuedDraft = useMemo(
    () => (queuedDrafts.length ? queuedDrafts[0] : null),
    [queuedDrafts],
  );

  const restoreQueuedDraft = useCallback(
    (draft?: ContactDraftRecord | null) => {
      const target = draft ?? latestQueuedDraft;
      if (!target) return;
      setName(target.payload?.name ?? '');
      setEmail(target.payload?.email ?? '');
      setMessage(target.payload?.message ?? '');
      setBanner({ type: 'info', message: 'Draft restored. Review and submit when ready.' });
      setShowQueuedPrompt(false);
    },
    [latestQueuedDraft],
  );

  const submitQueuedDraft = useCallback(
    async (draft?: ContactDraftRecord | null) => {
      const target = draft ?? latestQueuedDraft;
      if (!target) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setBanner({
          type: 'info',
          message: 'You are offline. Stay online to submit queued drafts or restore them for edits.',
        });
        setShowQueuedPrompt(true);
        return;
      }
      setSubmitting(true);
      setError('');
      try {
        const result = await processContactForm(target.payload);
        if (result.success) {
          await deleteContactDraft(target.id);
          setBanner({ type: 'success', message: 'Queued message sent.' });
          await refreshQueuedDrafts();
        } else if (result.queued) {
          setBanner({
            type: 'info',
            message: 'Connection dropped during resend. The draft remains in the queue.',
          });
          await refreshQueuedDrafts(true);
        } else {
          const msg = result.error || 'Failed to send queued draft.';
          setBanner({ type: 'error', message: msg });
          await refreshQueuedDrafts(true);
        }
      } catch {
        setBanner({ type: 'error', message: 'Failed to send queued draft.' });
        await refreshQueuedDrafts(true);
      } finally {
        setSubmitting(false);
      }
    },
    [latestQueuedDraft, refreshQueuedDrafts],
  );

  const dismissQueuePrompt = useCallback(() => {
    setShowQueuedPrompt(false);
  }, []);

  const formatTimestamp = useCallback(
    (value: number) => new Date(value).toLocaleString(),
    [],
  );

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
    } else if (result.queued) {
      setBanner({
        type: 'info',
        message: 'Offline detected. Your message was saved and will resend automatically when online.',
      });
      await refreshQueuedDrafts(true);
    } else {
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
            banner.type === 'success'
              ? 'bg-green-600'
              : banner.type === 'info'
              ? 'bg-blue-600'
              : 'bg-red-600'
          }`}
        >
          {banner.message}
        </div>
      )}
      {showQueuedPrompt && latestQueuedDraft && (
        <div className="mb-6 rounded border border-blue-500/60 bg-blue-900/30 p-4 text-sm">
          <p>
            You have {queuedDrafts.length} queued contact draft
            {queuedDrafts.length > 1 ? 's' : ''}. Latest saved{' '}
            {formatTimestamp(latestQueuedDraft.updatedAt || latestQueuedDraft.createdAt)}.
          </p>
          {latestQueuedDraft.lastError && (
            <p className="mt-2 text-xs text-blue-100/80">
              Last send attempt: {latestQueuedDraft.lastError.replace(/_/g, ' ')}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-blue-400 px-3 py-2 text-xs font-medium text-blue-100 transition hover:bg-blue-800"
              onClick={() => restoreQueuedDraft(latestQueuedDraft)}
            >
              Restore latest draft
            </button>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              onClick={() => submitQueuedDraft(latestQueuedDraft)}
            >
              Submit queued draft
            </button>
            <button
              type="button"
              className="rounded border border-transparent px-3 py-2 text-xs text-blue-100 underline-offset-2 hover:underline"
              onClick={dismissQueuePrompt}
            >
              Dismiss
            </button>
          </div>
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
      <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
        <div className="relative">
          <input
            id="contact-name"
            className="peer w-full rounded border border-gray-700 bg-gray-800 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder=" "
            aria-labelledby="contact-name-label"
          />
          <label
            htmlFor="contact-name"
            id="contact-name-label"
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
            aria-labelledby="contact-email-label"
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
            placeholder=" "
            aria-labelledby="contact-message-label"
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
            aria-label="Leave this field empty"
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

