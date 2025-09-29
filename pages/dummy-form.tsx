"use client";

import React, { useState, useEffect, useId, useMemo } from 'react';
import FormError from '../components/ui/FormError';

const STORAGE_KEY = 'dummy-form-draft';

type FieldName = 'name' | 'email' | 'message';

interface FieldError {
  field: FieldName;
  message: string;
}

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<FieldError | null>(null);
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const idBase = useId();
  const { errorIds, labelIds } = useMemo(
    () => {
      const sanitizedBase = idBase.replace(/:/g, '');
      return {
        errorIds: {
          name: `dummy-form-error-${sanitizedBase}-name`,
          email: `dummy-form-error-${sanitizedBase}-email`,
          message: `dummy-form-error-${sanitizedBase}-message`,
        } satisfies Record<FieldName, string>,
        labelIds: {
          name: `dummy-form-label-${sanitizedBase}-name`,
          email: `dummy-form-label-${sanitizedBase}-email`,
          message: `dummy-form-label-${sanitizedBase}-message`,
        } satisfies Record<FieldName, string>,
      };
    },
    [idBase]
  );

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
    if (!name.trim()) {
      setError({ field: 'name', message: 'Enter your name.' });
      return;
    }
    if (!email.trim()) {
      setError({ field: 'email', message: 'Enter your email.' });
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError({ field: 'email', message: 'Use a valid email address.' });
      return;
    }
    if (!message.trim()) {
      setError({ field: 'message', message: 'Add a message.' });
      return;
    }
    setError(null);
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
        {error?.field === 'name' && (
          <FormError id={errorIds.name} className="mb-4 mt-0">
            {error.message}
          </FormError>
        )}
        {error?.field === 'email' && (
          <FormError id={errorIds.email} className="mb-4 mt-0">
            {error.message}
          </FormError>
        )}
        {error?.field === 'message' && (
          <FormError id={errorIds.message} className="mb-4 mt-0">
            {error.message}
          </FormError>
        )}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="name"
          id={labelIds.name}
        >
          Name
        </label>
        <input
          id="name"
          className="mb-4 w-full rounded border p-2"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error?.field === 'name' || undefined}
          aria-describedby={error?.field === 'name' ? errorIds.name : undefined}
          aria-labelledby={labelIds.name}
        />
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="email"
          id={labelIds.email}
        >
          Email
        </label>
        <input
          id="email"
          className="mb-4 w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error?.field === 'email' || undefined}
          aria-describedby={error?.field === 'email' ? errorIds.email : undefined}
          aria-labelledby={labelIds.email}
        />
        <label
          className="mb-2 block text-sm font-medium"
          htmlFor="message"
          id={labelIds.message}
        >
          Message
        </label>
        <textarea
          id="message"
          className="mb-4 w-full rounded border p-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={error?.field === 'message' || undefined}
          aria-describedby={error?.field === 'message' ? errorIds.message : undefined}
          aria-labelledby={labelIds.message}
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
