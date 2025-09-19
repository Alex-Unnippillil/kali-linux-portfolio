"use client";

import React, { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/router';
import {
  buildErrorReportTemplate,
  ErrorCode,
  getLocalizedErrorEntry,
  isErrorCode,
  LocalizedErrorCatalogEntry,
} from '../types/errorCodes';

const subjectTemplates = [
  'General Inquiry',
  'Bug Report',
  'Feedback',
];

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
  const [status, setStatus] = useState('');
  const [useCaptcha, setUseCaptcha] = useState(false);
  const [emailjsReady, setEmailjsReady] = useState(false);
  const [attachedErrorCode, setAttachedErrorCode] = useState<ErrorCode | null>(null);
  const [errorTemplate, setErrorTemplate] = useState<string | null>(null);
  const [errorContext, setErrorContext] =
    useState<LocalizedErrorCatalogEntry | null>(null);

  useEffect(() => {
    const { preset, title, text, url, files } = router.query;
    if (preset === 'contact') {
      setSubject('General Inquiry');
    } else if (preset === 'bug') {
      setSubject('Bug Report');
    }
    const parts: string[] = [];
    if (title) parts.push(String(title));
    if (text) parts.push(String(text));
    if (url) parts.push(String(url));
    if (files) {
      try {
        const list = JSON.parse(
          decodeURIComponent(String(files))
        ) as { name: string; type: string }[];
        parts.push(
          ...list.map((f) => `File: ${f.name} (${f.type})`)
        );
      } catch {
        // ignore parse errors
      }
    }
    if (parts.length) {
      const incoming = parts.join('\n');
      setMessage((m) => (m ? `${m}\n${incoming}` : incoming));
    }
  }, [router.query]);

  useEffect(() => {
    const { errorCode: rawCode } = router.query as {
      errorCode?: string | string[];
    };

    if (!rawCode) {
      if (errorTemplate) {
        setMessage((current) => {
          const cleaned = current.replace(errorTemplate, '').trim();
          return cleaned;
        });
      }
      setErrorTemplate(null);
      setErrorContext(null);
      setAttachedErrorCode(null);
      return;
    }

    if (Array.isArray(rawCode) || !isErrorCode(rawCode)) {
      return;
    }

    const normalizedCode = rawCode as ErrorCode;
    if (attachedErrorCode === normalizedCode) {
      return;
    }

    const locale =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : undefined;
    const localized = getLocalizedErrorEntry(normalizedCode, locale);
    const template = buildErrorReportTemplate(normalizedCode, locale);

    setErrorContext(localized);
    setSubject('Bug Report');
    setMessage((current) => {
      const trimmed = current.trim();
      const cleaned =
        errorTemplate && trimmed
          ? trimmed.replace(errorTemplate, '').trim()
          : trimmed;
      return cleaned ? `${template}\n\n${cleaned}` : template;
    });
    setErrorTemplate(template);
    setAttachedErrorCode(normalizedCode);
  }, [router.query, attachedErrorCode, errorTemplate]);

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
        const queue: any[] = raw ? JSON.parse(raw) : [];
        for (const q of queue) {
          const token = q.useCaptcha
            ? await getRecaptchaToken(siteKey)
            : '';
          await emailjs.send(serviceId, templateId, {
            name: q.name,
            email: q.email,
            subject: q.subject,
            message: q.message,
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

  const enqueueMessage = (msg: {
    name: string;
    email: string;
    subject: string;
    message: string;
    useCaptcha: boolean;
  }) => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(msg);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailjsReady) {
      setStatus('Email service unavailable');
      return;
    }
    const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID as string;
    const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID as string;
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    if (!navigator.onLine) {
      enqueueMessage({ name, email, subject, message, useCaptcha });
      setStatus('Message queued; will send when online.');
      setName('');
      setEmail('');
      setMessage('');
      return;
    }
    const token = useCaptcha ? await getRecaptchaToken(siteKey) : '';
    setStatus('Sending...');
    try {
      await emailjs.send(serviceId, templateId, {
        name,
        email,
        subject,
        message,
        'g-recaptcha-response': token,
      });
      setStatus('Message sent!');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('Failed to send message');
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
      {errorContext && (
        <div className="mb-4 rounded border border-yellow-500 bg-yellow-100 p-3 text-sm text-black shadow-sm dark:border-yellow-300 dark:bg-yellow-900 dark:text-yellow-100">
          <p className="font-semibold">{errorContext.copy.title}</p>
          <p className="mt-1">{errorContext.copy.description}</p>
          <p className="mt-2 italic">{errorContext.copy.remediation}</p>
          <p className="mt-2 text-xs text-yellow-900 dark:text-yellow-200">
            Code: <span className="font-mono">{errorContext.code}</span> · Scope:{' '}
            {errorContext.scope} · Severity: {errorContext.severity}
          </p>
        </div>
      )}
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
      {status && (
        <div role="status" aria-live="polite" className="mt-2 text-sm">
          {status}
        </div>
      )}
    </div>
  );
};

export default InputHub;
