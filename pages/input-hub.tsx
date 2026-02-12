"use client";

import React, { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/router';

const subjectTemplates = [
  'General Inquiry',
  'Bug Report',
  'Feedback',
];

const openWindows = [
  {
    start: '2024-11-08T16:00:00Z',
    end: '2024-11-08T18:00:00Z',
  },
  {
    start: '2024-11-09T14:00:00Z',
    end: '2024-11-09T16:00:00Z',
  },
  {
    start: '2024-11-10T15:00:00Z',
    end: '2024-11-10T17:00:00Z',
  },
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
  const locale =
    typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  const formatSlot = (slot: { start: string; end: string }) => {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    };
    return `${new Date(slot.start).toLocaleString(locale, opts)} - ${new Date(
      slot.end,
    ).toLocaleString(locale, opts)}`;
  };

  const suggestTimes = () => {
    const suggestions = openWindows.map(formatSlot).join('\n');
    setMessage((m) => (m ? `${m}\n\n${suggestions}` : suggestions));
  };

  useEffect(() => {
    const { preset, title, text, url, files } = router.query;
    if (preset === 'contact') {
      setSubject('General Inquiry');
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
      <div className="mb-4">
        <h2 className="font-semibold">Open Windows</h2>
        <ul className="list-disc ml-5 text-sm">
          {openWindows.map((slot, i) => (
            <li key={i}>{formatSlot(slot)}</li>
          ))}
        </ul>
        <p className="text-sm mt-1">Typical response time: within 24 hours.</p>
        <p className="text-xs text-gray-600">
          Times shown in your local timezone ({locale}) to simplify scheduling.
        </p>
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
        <textarea
          className="p-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button
          type="button"
          className="text-blue-600 underline text-sm self-start"
          onClick={suggestTimes}
        >
          Suggest times
        </button>
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
