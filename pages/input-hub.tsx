"use client";

import React, { useEffect, useState } from 'react';
import emailjs from '@emailjs/browser';
import { useRouter } from 'next/router';

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
    <div className="p-space-2 text-black max-w-md mx-auto">
      <div className="mb-space-2">
        <span
          className={`px-space-1 py-space-1 text-sm rounded ${
            emailjsReady ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {emailjsReady ? 'EmailJS: Online' : 'EmailJS: Offline'}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-1">
        <input
          className="p-space-1 border"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="p-space-1 border"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          className="p-space-1 border"
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
          className="p-space-1 border"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <label className="flex items-center gap-space-1">
            <input
              type="checkbox"
              checked={useCaptcha}
              onChange={(e) => setUseCaptcha(e.target.checked)}
            />
            <span>Use reCAPTCHA</span>
          </label>
        )}
        <button type="submit" className="bg-blue-500 text-white px-space-1 py-space-1">
          Send
        </button>
      </form>
      {status && (
        <div role="status" aria-live="polite" className="mt-space-1 text-sm">
          {status}
        </div>
      )}
    </div>
  );
};

export default InputHub;
