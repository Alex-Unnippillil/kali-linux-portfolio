"use client";

import React, { useState, useEffect, useId } from 'react';
import FormError from '../components/ui/FormError';
import FormHint from '../components/ui/FormHint';

const STORAGE_KEY = 'dummy-form-draft';

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const hintBaseId = useId();
  const nameHintId = `${hintBaseId}-name`;
  const emailHintId = `${hintBaseId}-email`;
  const messageHintId = `${hintBaseId}-message`;
  const nameLabelId = `${hintBaseId}-name-label`;
  const emailLabelId = `${hintBaseId}-email-label`;
  const messageLabelId = `${hintBaseId}-message-label`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as {
          name?: string;
          email?: string;
          message?: string;
        };
        if (stored.name || stored.email || stored.message) {
          setName(stored.name || '');
          setEmail(stored.email || '');
          setMessage(stored.message || '');
          setRecovered(true);
        }
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = setTimeout(() => {
      const hasContent = name || email || message;
      try {
        if (hasContent) {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ name, email, message }),
          );
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore write errors
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !message) {
      setError('All fields are required');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    setSuccess(false);
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/dummy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      });
    }
    setSuccess(true);
    window.localStorage.removeItem(STORAGE_KEY);
    setName('');
    setEmail('');
    setMessage('');
    setRecovered(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {recovered && <p className="mb-4 text-sm text-blue-600">Recovered draft</p>}
        {error && <FormError className="mb-4 mt-0">{error}</FormError>}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="name"
            id={nameLabelId}
          >
            Name
          </label>
          <div className="relative">
            <input
              id="name"
              className="w-full rounded border p-2"
              type="text"
              value={name}
              onFocus={() => setActiveHint(nameHintId)}
              onBlur={() => setActiveHint((current) => (current === nameHintId ? null : current))}
              aria-describedby={activeHint === nameHintId ? nameHintId : undefined}
              aria-labelledby={nameLabelId}
              onChange={(e) => setName(e.target.value)}
            />
            <FormHint
              id={nameHintId}
              visible={activeHint === nameHintId}
              placement="right"
              panelClassName="bg-white text-gray-700 border-gray-200 shadow-lg"
            >
              Share your full name so we know how to address you when we reply.
            </FormHint>
          </div>
        </div>
        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="email"
            id={emailLabelId}
          >
            Email
          </label>
          <div className="relative">
            <input
              id="email"
              className="w-full rounded border p-2"
              type="email"
              value={email}
              onFocus={() => setActiveHint(emailHintId)}
              onBlur={() => setActiveHint((current) => (current === emailHintId ? null : current))}
              aria-describedby={activeHint === emailHintId ? emailHintId : undefined}
              aria-labelledby={emailLabelId}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormHint
              id={emailHintId}
              visible={activeHint === emailHintId}
              placement="right"
              panelClassName="bg-white text-gray-700 border-gray-200 shadow-lg"
            >
              Use the email where you&apos;d like to receive a confirmation.
            </FormHint>
          </div>
        </div>
        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="message"
            id={messageLabelId}
          >
            Message
          </label>
          <div className="relative">
            <textarea
              id="message"
              className="w-full rounded border p-2"
              value={message}
              onFocus={() => setActiveHint(messageHintId)}
              onBlur={() => setActiveHint((current) => (current === messageHintId ? null : current))}
              aria-describedby={activeHint === messageHintId ? messageHintId : undefined}
              aria-labelledby={messageLabelId}
              onChange={(e) => setMessage(e.target.value)}
            />
            <FormHint
              id={messageHintId}
              visible={activeHint === messageHintId}
              placement="right"
              panelClassName="bg-white text-gray-700 border-gray-200 shadow-lg"
            >
              Include context, links, or questions so we can respond accurately.
            </FormHint>
          </div>
        </div>
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
