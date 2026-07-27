"use client";

import React, { useEffect, useMemo, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/router';
import {
  DEFAULT_LOCALE,
  ErrorCode,
  Locale,
  getLocalizedErrorCopy,
  isErrorCode,
  listErrorCodes,
  matchLocale,
} from '../types/errorCodes';

const subjectTemplates = [
  'General Inquiry',
  'Bug Report',
  'Feedback',
];

type FormStatus =
  | { type: 'idle' }
  | { type: 'info'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; code: ErrorCode };

interface QueuedMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  useCaptcha: boolean;
  errorCode?: ErrorCode;
}

const formatMessageBody = (body: string, code?: ErrorCode) => {
  if (!code) return body;
  const tagged = `[Error code: ${code}]`;
  return body.includes(tagged) ? body : `${tagged}\n${body}`;
};

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

const QUEUE_KEY = 'input-hub-queue';

const InputHub = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(subjectTemplates[0]);
  const [message, setMessage] = useState('');
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [errorCode, setErrorCode] = useState<ErrorCode | ''>('');
  const [status, setStatus] = useState<FormStatus>({ type: 'idle' });
  const [useCaptcha, setUseCaptcha] = useState(false);
  const [emailjsReady, setEmailjsReady] = useState(false);
  const errorOptions = useMemo(() => listErrorCodes(), []);
  const selectedError = useMemo(
    () => (errorCode ? getLocalizedErrorCopy(errorCode, locale) : null),
    [errorCode, locale]
  );
  const statusDescriptor =
    status.type === 'error'
      ? getLocalizedErrorCopy(status.code, locale)
      : null;

  useEffect(() => {
    const { preset, title, text, url, files, errorCode: errorCodeQuery } =
      router.query;
    if (preset === 'contact') {
      setSubject('General Inquiry');
    }
    if (preset === 'bug-report') {
      setSubject('Bug Report');
      if (
        typeof errorCodeQuery === 'string' &&
        isErrorCode(errorCodeQuery)
      ) {
        setErrorCode(errorCodeQuery);
      }
    }
    const parts: string[] = [];
    if (title) parts.push(String(title));
    if (text) parts.push(String(text));
    if (url) parts.push(String(url));
    if (files) {
      const parseFiles = (raw: string) => {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      };
      const value = Array.isArray(files)
        ? files[0]
        : files;
      const rawValue = value ? String(value) : '';
      let list = rawValue ? parseFiles(rawValue) : null;
      if (!list && rawValue) {
        try {
          const decoded = decodeURIComponent(rawValue);
          if (decoded && decoded !== rawValue) {
            list = parseFiles(decoded);
          }
        } catch {
          // ignore decode errors
        }
      }
      if (list && list.length) {
        parts.push(
          ...list.map((f) => `File: ${f.name} (${f.type})`)
        );
      }
    }
    if (parts.length) {
      const incoming = parts.join('\n');
      setMessage((m) => (m ? `${m}\n${incoming}` : incoming));
    }
  }, [router.query]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setLocale(matchLocale(navigator.language));
  }, []);

  useEffect(() => {
    if (subject !== 'Bug Report' && errorCode) {
      setErrorCode('');
    }
  }, [subject, errorCode]);

  useEffect(() => {
    const userId = process.env.NEXT_PUBLIC_USER_ID;
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID;
    if (userId && serviceId && templateId) {
      try {
        emailjs.init(userId);
        setEmailjsReady(true);
      } catch {
        setEmailjsReady(false);
      }
    }
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID as string;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID as string;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

    const flushQueue = async () => {
      if (!emailjsReady || !navigator.onLine) return;
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        const queue: QueuedMessage[] = raw ? JSON.parse(raw) : [];
        for (const q of queue) {
          const token = q.useCaptcha
            ? await getRecaptchaToken(siteKey)
            : '';
          await emailjs.send(serviceId, templateId, {
            name: q.name,
            email: q.email,
            subject: q.subject,
            message: formatMessageBody(q.message, q.errorCode),
            error_code: q.errorCode ?? '',
            'g-recaptcha-response': token,
          });
        }
        if (queue.length) localStorage.removeItem(QUEUE_KEY);
      } catch {
        // ignore errors
      }
    };

    window.addEventListener('online', flushQueue);
    flushQueue();
    return () => window.removeEventListener('online', flushQueue);
  }, [emailjsReady]);

  const enqueueMessage = (msg: QueuedMessage) => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      const queue: QueuedMessage[] = raw ? JSON.parse(raw) : [];
      queue.push(msg);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailjsReady) {
      setStatus({
        type: 'error',
        code: ErrorCode.CONTACT_SERVICE_UNAVAILABLE,
      });
      return;
    }
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID as string;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID as string;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    if (!navigator.onLine) {
      enqueueMessage({
        name,
        email,
        subject,
        message,
        useCaptcha,
        errorCode: errorCode || undefined,
      });
      setStatus({
        type: 'success',
        message: 'Message queued; will send when online.',
      });
      setName('');
      setEmail('');
      setMessage('');
      return;
    }
    const token = useCaptcha ? await getRecaptchaToken(siteKey) : '';
    setStatus({ type: 'info', message: 'Sending...' });
    try {
      const preparedMessage = formatMessageBody(
        message,
        errorCode || undefined
      );
      await emailjs.send(serviceId, templateId, {
        name,
        email,
        subject,
        message: preparedMessage,
        error_code: errorCode || '',
        'g-recaptcha-response': token,
      });
      setStatus({ type: 'success', message: 'Message sent!' });
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus({
        type: 'error',
        code: ErrorCode.CONTACT_DELIVERY_FAILED,
      });
    }
  };

  return (
    <div className="p-4 text-black max-w-md mx-auto">
      <div className="mb-4">
        <span
          className={`px-2 py-1 text-sm rounded ${
            emailjsReady ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {emailjsReady ? 'EmailJS: Online' : 'EmailJS: Offline'}
        </span>
      </div>
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
        <select
          className="p-1 border"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          {subjectTemplates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {subject === 'Bug Report' && (
          <div className="rounded border border-gray-300 bg-gray-100 p-2 text-sm text-black">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-gray-600">
                Attach error code
              </span>
              <select
                className="p-1"
                value={errorCode}
                onChange={(e) =>
                  setErrorCode(
                    e.target.value
                      ? (e.target.value as ErrorCode)
                      : ''
                  )
                }
              >
                <option value="">Select an error code (optional)</option>
                {errorOptions.map((code) => {
                  const descriptor = getLocalizedErrorCopy(code, locale);
                  return (
                    <option key={code} value={code}>
                      {`${code} — ${descriptor.summary}`}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedError && (
              <div className="mt-2 space-y-1 text-xs text-gray-700">
                <p className="font-semibold">{selectedError.summary}</p>
                <p>{selectedError.remediation}</p>
              </div>
            )}
          </div>
        )}
        <textarea
          className="p-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useCaptcha}
            onChange={(e) => setUseCaptcha(e.target.checked)}
            disabled={!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
          />
          <span>Use reCAPTCHA</span>
        </label>
        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          Send
        </button>
      </form>
      {status.type !== 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-2 text-sm ${
            status.type === 'error'
              ? 'text-red-600'
              : status.type === 'success'
              ? 'text-green-700'
              : 'text-gray-800'
          }`}
        >
          {status.type === 'error' && statusDescriptor ? (
            <div className="space-y-1">
              <p className="font-semibold">{statusDescriptor.summary}</p>
              <p>{statusDescriptor.remediation}</p>
              <p className="text-xs text-gray-600">
                Error code: {statusDescriptor.code}
              </p>
            </div>
          ) : status.type === 'info' || status.type === 'success' ? (
            <span>{status.message}</span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InputHub;
