'use client';

import React, { useEffect, useState } from 'react';
import FormError from '../../components/ui/FormError';
import Toast from '../../components/ui/Toast';
import { processContactForm } from '../../components/apps/contact';
import { copyToClipboard } from '../../utils/clipboard';
import { openMailto } from '../../utils/mailto';

const DRAFT_KEY = 'contact-draft';
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

const ContactApp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setName(draft.name || '');
        setEmail(draft.email || '');
        setMessage(draft.message || '');
      } catch {
        /* ignore */
      }
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute('content') || '');
  }, []);

  useEffect(() => {
    const draft = { name, email, message };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
    const recaptchaToken = await getRecaptchaToken(siteKey);
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
      localStorage.removeItem(DRAFT_KEY);
    } else {
      setError(result.error || 'Submission failed');
      setToast('Failed to send');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="mb-4 text-2xl">Contact</h1>
      <p className="mb-4 text-sm">
        Prefer email?{' '}
        <button
          type="button"
          onClick={() => copyToClipboard(EMAIL)}
          className="underline mr-2"
        >
          Copy address
        </button>
        <button
          type="button"
          onClick={() => openMailto(EMAIL)}
          className="underline"
        >
          Open email app
        </button>
      </p>
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
        {error && <FormError>{error}</FormError>}
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
