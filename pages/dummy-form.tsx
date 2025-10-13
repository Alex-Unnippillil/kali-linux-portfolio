"use client";

import React, { useState, useEffect } from 'react';
import FormError from '../components/ui/FormError';

const STORAGE_KEY = 'dummy-form-draft';

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);

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
        <label className="mb-2 block text-sm font-medium" htmlFor="name">Name</label>
        <input
          id="name"
          className="mb-4 w-full rounded border p-2"
          type="text"
          inputMode="text"
          autoComplete="name"
          autoCorrect="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          className="mb-4 w-full rounded border p-2"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCorrect="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="mb-2 block text-sm font-medium" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="mb-4 w-full rounded border p-2"
          inputMode="text"
          autoComplete="on"
          autoCorrect="on"
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
