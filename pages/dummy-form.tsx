"use client";

import React, { useState, useEffect, useRef } from 'react';
import FormError from '../components/ui/FormError';

const STORAGE_KEY = 'dummy-form-draft';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = 'name' | 'email' | 'message';

type FormValues = Record<FieldName, string>;

type FieldErrors = Partial<Record<FieldName, string>>;

const DEFAULT_VALUES: FormValues = {
  name: '',
  email: '',
  message: '',
};

const DEFAULT_TOUCHED: Record<FieldName, boolean> = {
  name: false,
  email: false,
  message: false,
};

const validateForm = (values: FormValues): FieldErrors => {
  const nextErrors: FieldErrors = {};

  if (!values.name.trim()) {
    nextErrors.name = 'Name is required';
  }

  if (!values.email.trim()) {
    nextErrors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(values.email)) {
    nextErrors.email = 'Please enter a valid email';
  }

  if (!values.message.trim()) {
    nextErrors.message = 'Message is required';
  }

  return nextErrors;
};

const DummyForm: React.FC = () => {
  const [values, setValues] = useState<FormValues>({ ...DEFAULT_VALUES });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ ...DEFAULT_TOUCHED });
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleSummaryLinkClick = (field: FieldName) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const fieldElement = document.getElementById(field);
    fieldElement?.focus();
    fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<FormValues>;
        if (stored.name || stored.email || stored.message) {
          setValues({
            name: stored.name ?? '',
            email: stored.email ?? '',
            message: stored.message ?? '',
          });
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
      const hasContent = values.name || values.email || values.message;
      try {
        if (hasContent) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore write errors
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [values]);

  useEffect(() => {
    if (!hasSubmitted) {
      return;
    }
    if (!Object.values(errors).some(Boolean)) {
      return;
    }
    summaryRef.current?.focus();
  }, [errors, hasSubmitted]);

  const handleChange = (field: FieldName) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const nextValues = {
      ...values,
      [field]: event.target.value,
    } as FormValues;
    setValues(nextValues);
    if (touched[field] || hasSubmitted) {
      setErrors(validateForm(nextValues));
    }
    if (success) {
      setSuccess(false);
    }
  };

  const handleBlur = (field: FieldName) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateForm(values));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(values);
    setErrors(validation);
    setHasSubmitted(true);

    if (Object.values(validation).some(Boolean)) {
      setSuccess(false);
      return;
    }

    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/dummy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
    }

    setSuccess(true);
    setErrors({});
    setTouched({ ...DEFAULT_TOUCHED });
    setHasSubmitted(false);
    window.localStorage.removeItem(STORAGE_KEY);
    setValues({ ...DEFAULT_VALUES });
    setRecovered(false);
  };

  const visibleErrors: Record<FieldName, string> = {
    name: hasSubmitted || touched.name ? errors.name ?? '' : '',
    email: hasSubmitted || touched.email ? errors.email ?? '' : '',
    message: hasSubmitted || touched.message ? errors.message ?? '' : '',
  };

  const errorEntries = (Object.entries(errors) as [FieldName, string][]).filter(
    ([, message]) => Boolean(message),
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {recovered && <p className="mb-4 text-sm text-blue-600">Recovered draft</p>}
        {hasSubmitted && errorEntries.length > 0 && (
          <div
            ref={summaryRef}
            data-testid="error-summary"
            tabIndex={-1}
            role="alert"
            aria-labelledby="error-summary-title"
            className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <p id="error-summary-title" className="font-semibold">
              Please fix the following issues:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a
                    className="underline"
                    href={`#${field}`}
                    onClick={handleSummaryLinkClick(field)}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <label className="mb-2 block text-sm font-medium" htmlFor="name">Name</label>
        <input
          id="name"
          className={`mb-1 w-full rounded border p-2 ${visibleErrors.name ? 'border-red-600' : ''}`.trim()}
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          aria-invalid={visibleErrors.name ? 'true' : undefined}
          aria-describedby={visibleErrors.name ? 'name-error' : undefined}
        />
        {visibleErrors.name && (
          <FormError id="name-error" className="mb-3 mt-1">
            {visibleErrors.name}
          </FormError>
        )}
        <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          className={`mb-1 w-full rounded border p-2 ${visibleErrors.email ? 'border-red-600' : ''}`.trim()}
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          aria-invalid={visibleErrors.email ? 'true' : undefined}
          aria-describedby={visibleErrors.email ? 'email-error' : undefined}
        />
        {visibleErrors.email && (
          <FormError id="email-error" className="mb-3 mt-1">
            {visibleErrors.email}
          </FormError>
        )}
        <label className="mb-2 block text-sm font-medium" htmlFor="message">Message</label>
        <textarea
          id="message"
          className={`mb-1 w-full rounded border p-2 ${visibleErrors.message ? 'border-red-600' : ''}`.trim()}
          value={values.message}
          onChange={handleChange('message')}
          onBlur={handleBlur('message')}
          aria-invalid={visibleErrors.message ? 'true' : undefined}
          aria-describedby={visibleErrors.message ? 'message-error' : undefined}
        />
        {visibleErrors.message && (
          <FormError id="message-error" className="mb-3 mt-1">
            {visibleErrors.message}
          </FormError>
        )}
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
