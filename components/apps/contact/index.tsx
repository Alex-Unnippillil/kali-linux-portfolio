'use client';

import React, { useEffect, useState } from 'react';
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

const errorMap: Record<string, string> = {
  rate_limit: 'Too many requests. Please try again later.',
  invalid_input: 'Please check your input and try again.',
  invalid_csrf: 'Security token mismatch. Refresh and retry.',
  invalid_recaptcha: 'Captcha verification failed. Please try again.',
  recaptcha_disabled:
    'Captcha service is not configured. Please use the options above.',

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
      return {
        success: false,
        error: errorMap[body.code as string] || 'Submission failed',
        code: body.code as string,
      };
    }
    return { success: true };
  } catch {
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

const uploadAttachmentsWithProgress = async (
  files: File[],
  onProgress?: (value: number) => void
) =>
  new Promise<void>((resolve, reject) => {
    if (!files.length) {
      resolve();
      return;
    }
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/contact/attachments');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error('upload_failed'));
      }
    };
    xhr.onerror = () => reject(new Error('upload_failed'));
    xhr.send(form);
  });

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
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [recaptchaMessage, setRecaptchaMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentStatus, setAttachmentStatus] = useState('');

  const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

  useEffect(() => {
    (async () => {
      const draft = await readDraft();
      if (draft) {
        setName(draft.name || '');
        setEmail(draft.email || '');
        setMessage(draft.message || '');
      }
    })();
    if (isStaticExport) {
      setFallback(true);
      setRecaptchaMessage(
        'Static export detected. Use the email shortcuts to reach me directly.'
      );
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/contact');
        if (!res.ok) throw new Error('csrf');
        const body = await res.json().catch(() => ({}));
        setCsrfToken(body.csrfToken || '');
      } catch {
        setFallback(true);
        setRecaptchaMessage(
          'Contact service is offline right now. Use the copy + mailto actions below.'
        );
      }
    })();
  }, [isStaticExport]);

  useEffect(() => {
    if (fallback || isStaticExport) return;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    if (!siteKey) {
      setRecaptchaMessage(
        'Captcha is not configured. Use the email options to reach me.'
      );
      setFallback(true);
      setRecaptchaReady(false);
      return;
    }
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) {
      setRecaptchaMessage('Loading security checks…');
      const timer = window.setInterval(() => {
        const g = (window as any).grecaptcha;
        if (g) {
          g.ready(() => {
            setRecaptchaReady(true);
            setRecaptchaMessage('');
          });
          window.clearInterval(timer);
        }
      }, 400);
      return () => window.clearInterval(timer);
    }
    grecaptcha.ready(() => {
      setRecaptchaReady(true);
      setRecaptchaMessage('');
    });
  }, [fallback, isStaticExport]);

  useEffect(() => {
    void writeDraft({ name, email, message });
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    setError('');
    setBanner(null);
    setEmailError('');
    setMessageError('');
    setAttachmentStatus('');

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
    if (fallback) {
      setError('Server actions are offline. Use the email shortcuts above.');
      setBanner({ type: 'error', message: 'Form unavailable right now' });
      setSubmitting(false);
      return;
    }
    if (!recaptchaReady) {
      setError('Security checks are still loading. Please try again in a moment.');
      setBanner({ type: 'error', message: 'ReCAPTCHA not ready' });
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
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    let recaptchaToken = await getRecaptchaToken(siteKey);
    if (!recaptchaToken) {
      setRecaptchaReady(false);
      setRecaptchaMessage('Captcha verification failed. Reload or use email options.');
      setError('Captcha verification failed. Reload or use the email options.');
      setBanner({ type: 'error', message: 'Security verification failed' });
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
      if (attachments.length) {
        setUploading(true);
        setUploadProgress(0);
        try {
          await uploadAttachmentsWithProgress(attachments, setUploadProgress);
          setAttachmentStatus('Attachments uploaded successfully.');
          setAttachments([]);
        } catch {
          setAttachmentStatus(
            'Attachments could not be uploaded. You can send them via email instead.'
          );
        }
        setUploading(false);
      }
      void deleteDraft();
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
            banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {banner.message}
        </div>
      )}
      {(fallback || recaptchaMessage) && (
        <div className="mb-6 space-y-2 rounded border border-gray-700 bg-gray-800 p-4 text-sm">
          <p className="font-semibold text-red-200">
            {recaptchaMessage || 'The contact service is offline right now.'}
          </p>
          <p className="text-gray-300">
            Reach out directly while the form is unavailable:
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => copyToClipboard(EMAIL)}
              className="rounded border border-gray-600 px-3 py-1 hover:border-gray-400"
            >
              Copy address
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(message)}
              className="rounded border border-gray-600 px-3 py-1 hover:border-gray-400"
            >
              Copy message
            </button>
            <button
              type="button"
              onClick={() => openMailto(EMAIL, '', message)}
              className="rounded border border-gray-600 px-3 py-1 hover:border-gray-400"
            >
              Open email app
            </button>
          </div>
        </div>
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
        />
        {error && <FormError className="mt-3">{error}</FormError>}
        <button
          type="submit"
          disabled={submitting || uploading || fallback || !recaptchaReady}
          className="flex items-center justify-center rounded bg-blue-600 px-4 py-2 disabled:opacity-50"
        >
          {submitting ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : uploading ? (
            'Uploading attachments...'
          ) : fallback ? (
            'Form unavailable'
          ) : !recaptchaReady ? (
            'Preparing security checks...'
          ) : (
            'Send'
          )}
        </button>
        {recaptchaMessage && (
          <p className="text-xs text-gray-400" role="status">
            {recaptchaMessage}
          </p>
        )}
        {uploading && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-700" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-blue-500 transition-[width]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {attachmentStatus && (
          <p className="text-xs text-gray-300" role="status">
            {attachmentStatus}
          </p>
        )}
      </form>
    </div>
  );
};

export default ContactApp;

