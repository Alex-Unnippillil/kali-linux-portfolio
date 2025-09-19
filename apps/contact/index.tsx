"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import FormError from "../../components/ui/FormError";
import Toast from "../../components/ui/Toast";
import { processContactForm } from "../../components/apps/contact";
import { contactSchema } from "../../utils/contactSchema";
import { copyToClipboard } from "../../utils/clipboard";
import { openMailto } from "../../utils/mailto";
import { useI18n } from "../../lib/i18n";
import { createFormValidator, type FieldErrors } from "../../lib/validation/form-validator";
import { trackEvent } from "@/lib/analytics-client";

const DRAFT_KEY = "contact-draft";
const EMAIL = "alex.unnippillil@hotmail.com";

const getRecaptchaToken = (siteKey: string): Promise<string> =>
  new Promise((resolve) => {
    const g: any = (window as any).grecaptcha;
    if (!g || !siteKey) return resolve("");
    g.ready(() => {
      g
        .execute(siteKey, { action: "submit" })
        .then((token: string) => resolve(token))
        .catch(() => resolve(""));
    });
  });

const contactFormSchema = contactSchema.pick({
  name: true,
  email: true,
  message: true,
  honeypot: true,
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const ContactApp: React.FC = () => {
  const { t } = useI18n();

  const validator = useMemo(
    () =>
      createFormValidator<ContactFormData>({
        schema: contactFormSchema,
        t,
        fieldLabels: {
          name: "forms.contact.fields.name",
          email: "forms.contact.fields.email",
          message: "forms.contact.fields.message",
        },
        asyncRules: {
          email: [async (value) => {
            const normalized = value.toLowerCase();
            const blockedDomains = ["example.com", "test.com"];
            if (blockedDomains.some((domain) => normalized.endsWith(`@${domain}`))) {
              return "forms.contact.errors.emailDomain";
            }
            return null;
          }],
        },
      }),
    [t],
  );

  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    message: "",
    honeypot: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ContactFormData>>({});
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as Partial<ContactFormData> | null;
        if (draft) {
          setForm((prev) => ({
            ...prev,
            name: draft.name ?? "",
            email: draft.email ?? "",
            message: draft.message ?? "",
          }));
        }
      } catch {
        /* ignore */
      }
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute("content") || "");
  }, []);

  useEffect(() => {
    const draft = { name: form.name, email: form.email, message: form.message };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [form.name, form.email, form.message]);

  const updateField = <K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev } as FieldErrors<ContactFormData>;
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const result = await validator.validate(form);
    if (!result.data) {
      setErrors(result.errors);
      setError(t("forms.contact.form.validation"));
      setSubmitting(false);
      trackEvent("contact_submit_error", { method: "form" });
      return;
    }

    const normalized = result.data;
    setForm(normalized);

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
    const recaptchaToken = await getRecaptchaToken(siteKey);
    if (!recaptchaToken) {
      setError(t("forms.contact.errors.captcha"));
      setSubmitting(false);
      trackEvent("contact_submit_error", { method: "form" });
      return;
    }

    try {
      const response = await processContactForm({
        ...normalized,
        csrfToken,
        recaptchaToken,
      });
      if (response.success) {
        setToast(t("forms.contact.form.success"));
        setForm({ name: "", email: "", message: "", honeypot: "" });
        setErrors({});
        localStorage.removeItem(DRAFT_KEY);
        trackEvent("contact_submit", { method: "form" });
      } else {
        setError(response.error || t("forms.contact.errors.submission"));
        trackEvent("contact_submit_error", { method: "form" });
      }
    } catch {
      setError(t("forms.contact.errors.submission"));
      trackEvent("contact_submit_error", { method: "form" });
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="mb-4 text-2xl">Contact</h1>
      <p className="mb-4 text-sm">
        Prefer email?{" "}
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
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
        <div>
          <label htmlFor="contact-name" className="mb-[6px] block text-sm">
            Name
          </label>
          <div className="relative">
            <input
              id="contact-name"
              className="h-11 w-full rounded border border-gray-700 bg-gray-800 pl-10 pr-3 text-white"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25v-1.5A4.5 4.5 0 0 1 9 14.25h6a4.5 4.5 0 0 1 4.5 4.5v1.5"
              />
            </svg>
          </div>
          {errors.name && (
            <FormError id="contact-name-error" className="mt-2">
              {errors.name}
            </FormError>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-[6px] block text-sm">
            Email
          </label>
          <div className="relative">
            <input
              id="contact-email"
              type="email"
              className="h-11 w-full rounded border border-gray-700 bg-gray-800 pl-10 pr-3 text-white"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 17.25V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25ZM3 6l9 6 9-6"
              />
            </svg>
          </div>
          {errors.email && (
            <FormError id="contact-email-error" className="mt-2">
              {errors.email}
            </FormError>
          )}
        </div>
        <div>
          <label htmlFor="contact-message" className="mb-[6px] block text-sm">
            Message
          </label>
          <div className="relative">
            <textarea
              id="contact-message"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 pl-10 text-white"
              rows={4}
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              required
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "contact-message-error" : undefined}
            />
            <svg
              className="pointer-events-none absolute left-3 top-3 h-6 w-6 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286a2.25 2.25 0 0 1-1.98 2.193c-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.1 2.1 0 0 1-.825-.242M3.75 7.5c0-1.621 1.152-3.026 2.76-3.235A48.455 48.455 0 0 1 12 3c2.115 0 4.198.137 6.24.402 1.608.209 2.76 1.614 2.76 3.235v6.226c0 1.621-1.152 3.026-2.76 3.235-.577.075-1.157.14-1.74.194V21L12.345 16.845"
              />
            </svg>
          </div>
          {errors.message && (
            <FormError id="contact-message-error" className="mt-2">
              {errors.message}
            </FormError>
          )}
        </div>
        <input
          type="text"
          value={form.honeypot}
          onChange={(e) => updateField("honeypot", e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />
        {error && <FormError>{error}</FormError>}
        <button
          type="submit"
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center rounded bg-blue-600 px-4 sm:w-auto disabled:opacity-50"
        >
          {submitting ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Send"
          )}
        </button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default ContactApp;

