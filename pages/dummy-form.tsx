"use client";

import React, { useState, useEffect } from 'react';
import FormError from '../components/ui/FormError';
import Button from '../components/ui/Button';
import { TextAreaField, TextField } from '../components/ui/FormField';

const STORAGE_KEY = 'dummy-form-draft';

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [submitting, setSubmitting] = useState(false);
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
    const newErrors: { name?: string; email?: string; message?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    }

    if (Object.keys(newErrors).length) {
      setFieldErrors(newErrors);
      setError('');
      setSuccess(false);
      return;
    }

    setFieldErrors({});
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
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
    } catch (submitError) {
      setError('Something went wrong while submitting the form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--kali-bg)] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-[color:var(--color-surface)]/95 p-6 shadow-[var(--shadow-2)]"
      >
        <h1 className="mb-4 text-xl font-bold text-kali-text">Contact Us</h1>
        {recovered && <p className="mb-4 text-sm text-[color:var(--kali-blue)]">Recovered draft</p>}
        {error && <FormError className="mb-4 mt-0">{error}</FormError>}
        {success && <p className="mb-4 text-sm text-[color:var(--game-color-success)]">Form submitted successfully!</p>}
        <TextField
          id="name"
          label="Name"
          value={name}
          state={fieldErrors.name ? 'error' : 'default'}
          message={fieldErrors.name}
          disabled={submitting}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          className="mt-4"
          description="We only use your email to reply."
          value={email}
          state={fieldErrors.email ? 'error' : success ? 'success' : 'default'}
          message={fieldErrors.email || (success ? 'Thanks! We will be in touch soon.' : undefined)}
          disabled={submitting}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
        <TextAreaField
          id="message"
          label="Message"
          className="mt-4"
          value={message}
          state={fieldErrors.message ? 'error' : 'default'}
          message={fieldErrors.message}
          disabled={submitting}
          onChange={(e) => {
            setMessage(e.target.value);
            setFieldErrors((prev) => ({ ...prev, message: undefined }));
          }}
        />
        <Button type="submit" className="mt-6 w-full" loading={submitting}>
          Submit
        </Button>
        <p className="mt-4 text-xs text-kali-text/70">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
