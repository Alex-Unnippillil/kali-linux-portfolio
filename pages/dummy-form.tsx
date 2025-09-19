"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import FormError from '../components/ui/FormError';
import { useI18n } from '../lib/i18n';
import { createFormValidator, type FieldErrors } from '../lib/validation/form-validator';

const STORAGE_KEY = 'dummy-form-draft';

const dummySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .transform((value) => value.replace(/\s+/g, ' ')),
  email: z.string().trim().email(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .transform((value) => value.replace(/\s+/g, ' ')),
});

type DummyFormData = z.infer<typeof dummySchema>;

const DummyForm: React.FC = () => {
  const { t } = useI18n();

  const validator = useMemo(
    () =>
      createFormValidator<DummyFormData>({
        schema: dummySchema,
        t,
        fieldLabels: {
          name: 'forms.dummy.fields.name',
          email: 'forms.dummy.fields.email',
          message: 'forms.dummy.fields.message',
        },
      }),
    [t],
  );

  const [form, setForm] = useState<DummyFormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FieldErrors<DummyFormData>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<DummyFormData> | null;
      if (stored) {
        const nextForm: DummyFormData = {
          name: stored.name ?? '',
          email: stored.email ?? '',
          message: stored.message ?? '',
        };
        if (nextForm.name || nextForm.email || nextForm.message) {
          setForm(nextForm);
          setRecovered(true);
        }
      }
    } catch {
      // ignore storage parsing errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = setTimeout(() => {
      const hasContent = form.name || form.email || form.message;
      try {
        if (hasContent) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // ignore write errors
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [form]);

  const updateField = <K extends keyof DummyFormData>(field: K, value: DummyFormData[K]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev } as FieldErrors<DummyFormData>;
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setFormError('');

    const result = await validator.validate(form);
    if (!result.data) {
      setErrors(result.errors);
      setFormError(t('validation.errors.form'));
      return;
    }

    const normalized = result.data;

    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      await fetch('/api/dummy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      });
    }

    setForm({ name: '', email: '', message: '' });
    setErrors({});
    setSuccess(true);
    setRecovered(false);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-md" noValidate>
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {recovered && (
          <p className="mb-4 text-sm text-blue-600">{t('forms.dummy.messages.recovered')}</p>
        )}
        {formError && <FormError className="mb-4 mt-0">{formError}</FormError>}
        {success && (
          <p className="mb-4 text-sm text-green-600">{t('forms.dummy.messages.success')}</p>
        )}
        <label className="mb-2 block text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="mb-2 w-full rounded border p-2"
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'dummy-name-error' : undefined}
        />
        {errors.name && (
          <FormError id="dummy-name-error" className="mb-2">
            {errors.name}
          </FormError>
        )}
        <label className="mb-2 mt-2 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="mb-2 w-full rounded border p-2"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'dummy-email-error' : undefined}
        />
        {errors.email && (
          <FormError id="dummy-email-error" className="mb-2">
            {errors.email}
          </FormError>
        )}
        <label className="mb-2 mt-2 block text-sm font-medium" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          className="mb-2 w-full rounded border p-2"
          value={form.message}
          onChange={(e) => updateField('message', e.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'dummy-message-error' : undefined}
        />
        {errors.message && (
          <FormError id="dummy-message-error" className="mb-2">
            {errors.message}
          </FormError>
        )}
        <button type="submit" className="mt-2 w-full rounded bg-blue-600 p-2 text-white">
          Submit
        </button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your
          information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;

