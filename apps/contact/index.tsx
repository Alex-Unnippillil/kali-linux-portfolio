"use client";

import React, { useEffect, useState } from "react";
import FormError from "../../components/ui/FormError";
import Toast from "../../components/ui/Toast";
import { processContactForm } from "../../components/apps/contact";
import { copyToClipboard } from "../../utils/clipboard";
import { openMailto } from "../../utils/mailto";
import { trackEvent } from "@/lib/analytics-client";
import { getErrorMessage } from "@/src/lib/errors/taxonomy";

const DRAFT_KEY = "contact-draft";
const EMAIL = "alex.unnippillil@hotmail.com";

const getRecaptchaToken = (siteKey: string): Promise<string> =>
  new Promise((resolve) => {
    const g: any = (window as any).grecaptcha;
    if (!g || !siteKey) return resolve("");
    g.ready(() => {
      g.execute(siteKey, { action: "submit" })
        .then((token: string) => resolve(token))
        .catch(() => resolve(""));
    });
  });

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const MAX_RETRIES = 3;

const ContactApp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setName(draft.name || "");
        setEmail(draft.email || "");
        setMessage(draft.message || "");
      } catch {
        /* ignore */
      }
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute("content") || "");
  }, []);

  useEffect(() => {
    const draft = { name, email, message };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, email, message]);

  const attemptSubmit = async (attempt = 0): Promise<void> => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
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
      setToast("Message sent");
      setName("");
      setEmail("");
      setMessage("");
      setHoneypot("");
      localStorage.removeItem(DRAFT_KEY);
      trackEvent("contact_submit", { method: "form", retries: attempt });
      setSubmitting(false);
      return;
    }

    const reason = result.code || "unknown";
    trackEvent("contact_submit_error", { method: "form", reason, retries: attempt });

    if (result.retryAfter && attempt < MAX_RETRIES) {
      for (let i = result.retryAfter; i > 0; i--) {
        setRetryAfter(i);
        setError(`${getErrorMessage(reason)} Retrying in ${i}s...`);
        await delay(1000);
      }
      setRetryAfter(0);
      await attemptSubmit(attempt + 1);
    } else {
      setError(result.error || getErrorMessage(reason));
      setToast("Failed to send");
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || retryAfter > 0) return;
    setError("");
    setToast("");
    setSubmitting(true);
    await attemptSubmit(0);
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
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="contact-name" className="mb-[6px] block text-sm">
            Name
          </label>
          <div className="relative">
            <input
              id="contact-name"
              className="h-11 w-full rounded border border-gray-700 bg-gray-800 pl-10 pr-3 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
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
          disabled={submitting || retryAfter > 0}
          className="flex h-12 w-full items-center justify-center rounded bg-blue-600 px-4 sm:w-auto disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default ContactApp;
