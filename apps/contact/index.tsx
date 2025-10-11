"use client";

import React, { useEffect, useState } from "react";
import FormError from "../../components/ui/FormError";
import Toast from "../../components/ui/Toast";
import { processContactForm } from "../../components/apps/contact";
import { contactSchema } from "../../utils/contactSchema";
import { copyToClipboard } from "../../utils/clipboard";
import { openMailto } from "../../utils/mailto";
import { trackEvent } from "@/lib/analytics-client";

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

const ContactApp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [messageError, setMessageError] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    setEmailError("");
    setMessageError("");

    const emailResult = contactSchema.shape.email.safeParse(email);
    const messageResult = contactSchema.shape.message.safeParse(message);
    let hasValidationError = false;
    if (!emailResult.success) {
      setEmailError("Invalid email");
      hasValidationError = true;
    }
    if (!messageResult.success) {
      setMessageError("1-1000 chars");
      hasValidationError = true;
    }
    if (hasValidationError) {
      setSubmitting(false);
      setError("Please fix the errors above and try again.");
      trackEvent("contact_submit_error", { method: "form" });
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
    const recaptchaToken = await getRecaptchaToken(siteKey);
    if (!recaptchaToken) {
      setError("Captcha verification failed. Please try again.");
      setSubmitting(false);
      trackEvent("contact_submit_error", { method: "form" });
      return;
    }

    try {
      const result = await processContactForm({
        name,
        email,
        message,
        honeypot,
        csrfToken,
        recaptchaToken,
      });
      if (result.success) {
        const confirmation =
          "Your message is on its way. Expect a reply within 24 hours.";
        setToast("Message sent");
        setSuccessMessage(confirmation);
        setName("");
        setEmail("");
        setMessage("");
        setHoneypot("");
        localStorage.removeItem(DRAFT_KEY);
        trackEvent("contact_submit", { method: "form" });
      } else {
        setError(result.error || "Submission failed");
        trackEvent("contact_submit_error", { method: "form" });
      }
    } catch {
      setError("Submission failed");
      trackEvent("contact_submit_error", { method: "form" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="mb-2 text-2xl">Contact</h1>
          <p className="text-sm text-gray-300">
            Let me know how I can help with your security project, workshop, or
            collaboration idea.
          </p>
        </div>
        {successMessage && (
          <div
            role="alert"
            className="rounded border border-green-500/40 bg-green-900/30 px-4 py-3 text-sm text-green-100 shadow-lg shadow-green-900/20"
          >
            <p className="font-semibold text-green-200">Message sent</p>
            <p className="mt-1">{successMessage}</p>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[1.6fr,1fr]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded border border-gray-800 bg-gray-900/70 p-6 shadow-lg">
            <div className="flex flex-col gap-2 rounded border border-gray-800/60 bg-gray-900/80 p-4 text-sm text-gray-300">
              <p className="font-medium text-gray-100">Prefer email?</p>
              <p className="leading-relaxed">
                {"Reach me at "}
                <span className="font-mono text-blue-300">{EMAIL}</span>. Copy
                the address or open your default mail client.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => copyToClipboard(EMAIL)}
                  className="rounded border border-blue-500/60 px-3 py-1 font-medium text-blue-300 transition hover:bg-blue-500/10"
                >
                  Copy address
                </button>
                <button
                  type="button"
                  onClick={() => openMailto(EMAIL)}
                  className="rounded border border-blue-500/60 px-3 py-1 font-medium text-blue-300 transition hover:bg-blue-500/10"
                >
                  Open email app
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-[6px] block text-sm"
                  id="contact-name-label"
                >
                  Name
                </label>
                <div className="relative">
                  <input
                    id="contact-name"
                    className="h-11 w-full rounded border border-gray-700 bg-gray-800 pl-10 pr-3 text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-labelledby="contact-name-label"
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
                <label
                  htmlFor="contact-email"
                  className="mb-[6px] block text-sm"
                  id="contact-email-label"
                >
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
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "contact-email-error" : undefined}
                    aria-labelledby="contact-email-label"
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
                {emailError && (
                  <FormError id="contact-email-error" className="mt-2">
                    {emailError}
                  </FormError>
                )}
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-[6px] block text-sm"
                  id="contact-message-label"
                >
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
                    aria-invalid={!!messageError}
                    aria-describedby={messageError ? "contact-message-error" : undefined}
                    aria-labelledby="contact-message-label"
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
                {messageError && (
                  <FormError id="contact-message-error" className="mt-2">
                    {messageError}
                  </FormError>
                )}
              </div>
            </div>
            <input
              type="hidden"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
            />
            {error && <FormError>{error}</FormError>}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center rounded bg-blue-600 px-4 text-sm font-semibold uppercase tracking-wide shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send message"}
              </button>
              {submitting && (
                <div
                  role="progressbar"
                  aria-label="Sending message"
                  className="h-1 w-full overflow-hidden rounded bg-blue-900/50"
                >
                  <div className="h-full w-full origin-left animate-pulse bg-blue-400" />
                </div>
              )}
            </div>
          </form>
          <aside className="flex flex-col gap-6 rounded border border-gray-800 bg-gray-900/70 p-6 shadow-lg">
            <section>
              <h2 className="text-lg font-semibold text-blue-200">Response time</h2>
              <p className="mt-2 text-sm text-gray-300">
                I typically reply within <span className="font-medium">24 hours</span>
                . Urgent inquiries are prioritized and receive a same-day
                acknowledgement.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-blue-200">FAQs</h2>
              <ul className="mt-2 space-y-3 text-sm text-gray-300">
                <li>
                  <span className="block font-medium text-gray-100">
                    Do you accept collaboration proposals?
                  </span>
                  Absolutely—share your idea and any timelines so I can plan the
                  next steps.
                </li>
                <li>
                  <span className="block font-medium text-gray-100">
                    What should I include?
                  </span>
                  Provide context, goals, and any relevant documentation to
                  speed up the conversation.
                </li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-blue-200">Trust badges</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-gray-200">
                <span className="rounded border border-emerald-500/60 px-3 py-1 text-emerald-300">
                  GDPR mindful
                </span>
                <span className="rounded border border-sky-500/60 px-3 py-1 text-sky-300">
                  Security focused
                </span>
                <span className="rounded border border-violet-500/60 px-3 py-1 text-violet-300">
                  Open source ally
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default ContactApp;
