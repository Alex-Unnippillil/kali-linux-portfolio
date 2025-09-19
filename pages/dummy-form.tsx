"use client";

import React, { useState, useEffect } from 'react';
import FormError from '../components/ui/FormError';
import useDraftAutosave from '@/hooks/useDraftAutosave';

const STORAGE_KEY = 'dummy-form-draft';

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { draft, statusMessage, clearDraft, recovered } = useDraftAutosave({
    storageKey: STORAGE_KEY,
    snapshot: { name, email, message },
    isEmpty: (data) => !data.name.trim() && !data.email.trim() && !data.message.trim(),
  });

  useEffect(() => {
    if (!draft) return;
    setName(draft.name || '');
    setEmail(draft.email || '');
    setMessage(draft.message || '');
  }, [draft]);

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
    clearDraft();
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {(statusMessage || recovered) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span>{statusMessage || 'Recovered draft'}</span>
            <button
              type="button"
              onClick={() => {
                setName('');
                setEmail('');
                setMessage('');
                clearDraft();
              }}
              className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              Clear draft
            </button>
          </div>
        )}
        {error && <FormError className="mb-4 mt-0">{error}</FormError>}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <label className="mb-2 block text-sm font-medium" htmlFor="name">Name</label>
        <input
          id="name"
          className="mb-4 w-full rounded border p-2"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          className="mb-4 w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="mb-2 block text-sm font-medium" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="mb-4 w-full rounded border p-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
