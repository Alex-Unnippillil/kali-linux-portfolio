"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import FormError from '../components/ui/FormError';

const STORAGE_KEY = 'dummy-form-draft';

type FormField = 'name' | 'email' | 'message';
type FormErrors = Partial<Record<FormField, string>>;

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const summaryRef = useRef<HTMLDivElement>(null);

  const errorOrder: FormField[] = useMemo(() => ['name', 'email', 'message'], []);

  const errorMessages: Record<FormField, string> = {
    name: 'Name is required',
    email: 'Email is required',
    message: 'Message is required',
  };

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

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      summaryRef.current?.focus();
    }
  }, [errors]);

  const clearFieldError = (field: FormField) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const { [field]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const handleErrorLinkClick = (field: FormField) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(field);
    target?.focus();
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = errorMessages.name;
    }

    if (!email.trim()) {
      newErrors.email = errorMessages.email;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!message.trim()) {
      newErrors.message = errorMessages.message;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSuccess(false);
      return;
    }

    setErrors({});
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
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {recovered && <p className="mb-4 text-sm text-blue-600">Recovered draft</p>}
        {Object.keys(errors).length > 0 && (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="form-error-summary-title"
            className="mb-4 mt-0 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <p id="form-error-summary-title" className="font-semibold">
              Please fix the following errors:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorOrder
                .filter((field) => errors[field])
                .map((field) => (
                  <li key={field}>
                    <a
                      className="underline"
                      href={`#${field}`}
                      onClick={handleErrorLinkClick(field)}
                    >
                      {errors[field]}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <label id="name-label" className="mb-2 block text-sm font-medium" htmlFor="name">Name</label>
        <input
          id="name"
          className="mb-4 w-full rounded border p-2"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearFieldError('name');
          }}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-labelledby="name-label"
        />
        {errors.name && <FormError id="name-error">{errors.name}</FormError>}
        <label id="email-label" className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          className="mb-4 w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
          }}
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-labelledby="email-label"
        />
        {errors.email && <FormError id="email-error">{errors.email}</FormError>}
        <label id="message-label" className="mb-2 block text-sm font-medium" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="mb-4 w-full rounded border p-2"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            clearFieldError('message');
          }}
          aria-invalid={errors.message ? 'true' : undefined}
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-labelledby="message-label"
        />
        {errors.message && <FormError id="message-error">{errors.message}</FormError>}
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
