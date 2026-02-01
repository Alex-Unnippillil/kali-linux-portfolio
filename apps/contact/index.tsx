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
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const threatChecklist = [
  {
    title: "Define your scope",
    description: "Outline assets, teams, and timelines that need protection.",
  },
  {
    title: "Map threat actors",
    description: "List the realistic attack paths and who might pursue them.",
  },
  {
    title: "Document controls",
    description: "Share mitigations already in place or planned for launch.",
  },
];

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
  const [fallback, setFallback] = useState(false);
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
    const metaToken =
      typeof document !== "undefined"
        ? document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content")
        : null;
    if (metaToken) {
      setCsrfToken(metaToken);
      return;
    }
    (async () => {
      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]'
      );
      if (meta?.content) {
        setCsrfToken(meta.content);
        return;
      }
      try {
        const res = await fetch("/api/contact", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          if (data?.csrfToken) {
            setCsrfToken(data.csrfToken);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const draft = { name, email, message };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fallback) {
      setError("Form disabled here. Please use the email options above.");
      return;
    }
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
    const recaptchaToken = DEMO_MODE
      ? "demo"
      : await getRecaptchaToken(siteKey);
    if (!DEMO_MODE && !recaptchaToken) {
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
    <div className="min-h-screen bg-kali-backdrop p-4 text-[color:var(--kali-text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <h1 className="mb-2 text-2xl">Contact</h1>
          <p className="text-sm text-[color:var(--kali-text-muted)]">
            Let me know how I can help with your security project, workshop, or
            collaboration idea.
          </p>
        </div>
        {fallback && (
          <div
            role="note"
            className="flex items-start gap-3 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-warning)_16%,var(--kali-panel))] px-5 py-4 text-sm text-[color:var(--kali-text)] shadow-lg shadow-kali-panel"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--kali-warning)_30%,transparent)] text-[color:var(--kali-warning)]"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.593C19.023 15.98 18.228 17 17.018 17H2.982c-1.21 0-2.005-1.02-1.243-2.308L8.257 3.1ZM10 7a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 10 7Zm0 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-[color:var(--kali-warning)]">Static preview</p>
              <p className="mt-1 leading-relaxed text-[color:var(--kali-text-muted)]">
                This static build cannot reach the contact API. Copy the email address or open your mail client to get in touch directly.
              </p>
            </div>
          </div>
        )}
        {successMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_16%,var(--kali-panel))] px-5 py-4 text-sm text-[color:var(--kali-text)] shadow-lg shadow-kali-panel"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--kali-control)_30%,transparent)] text-[color:var(--kali-control)]"
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 0 1 .006 1.414l-6.25 6.375a1 1 0 0 1-1.438.012l-3.25-3.125a1 1 0 1 1 1.386-1.44l2.53 2.436 5.553-5.665a1 1 0 0 1 1.463-.007Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-[color:var(--kali-control)]">Message sent</p>
              <p className="mt-1 leading-relaxed text-[color:var(--kali-text-muted)]">
                {successMessage}
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[1.6fr,1fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-8 rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-surface)] p-6 shadow-kali-panel"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-surface)_85%,transparent)] p-4 text-sm text-[color:var(--kali-text-muted)]">
              <p className="font-semibold text-[color:var(--kali-text)]">Prefer email?</p>
              <p className="leading-relaxed text-[color:var(--kali-text-muted)]">
                {"Reach me at "}
                <span className="font-mono text-[color:var(--kali-control)]">{EMAIL}</span>. Copy
                the address or open your default mail client.
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => copyToClipboard(EMAIL)}
                  className="rounded-md border border-[color:color-mix(in_srgb,var(--kali-control)_60%,transparent)] px-3 py-1 font-medium text-[color:var(--kali-control)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_18%,transparent)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--kali-control)]"
                >
                  Copy address
                </button>
                <button
                  type="button"
                  onClick={() => openMailto(EMAIL)}
                  className="rounded-md border border-[color:color-mix(in_srgb,var(--kali-control)_60%,transparent)] px-3 py-1 font-medium text-[color:var(--kali-control)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_18%,transparent)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--kali-control)]"
                >
                  Open email app
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-medium text-[color:var(--kali-text)]"
                  id="contact-name-label"
                >
                  Name
                </label>
                <p className="text-xs text-[color:var(--kali-text-subtle)]">
                  Introduce yourself so I know how to address you in the reply.
                </p>
                <div className="relative">
                  <input
                    id="contact-name"
                    className="h-11 w-full rounded-lg border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] pl-10 pr-3 text-[color:var(--kali-text)] shadow-inner shadow-[inset_0_1px_0_0_color:color-mix(in_srgb,var(--kali-panel)_55%,transparent)] transition focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--kali-control)_60%,transparent)] focus:ring-offset-2 focus:ring-offset-[var(--kali-bg)]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-labelledby="contact-name-label"
                  />
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[color:var(--kali-text-faint)]"
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
              <div className="space-y-2">
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-[color:var(--kali-text)]"
                  id="contact-email-label"
                >
                  Email
                </label>
                <p className="text-xs text-[color:var(--kali-text-subtle)]">
                  I will use this address to send follow-ups or share resources.
                </p>
                <div className="relative">
                  <input
                    id="contact-email"
                    type="email"
                    className="h-11 w-full rounded-lg border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] pl-10 pr-3 text-[color:var(--kali-text)] shadow-inner shadow-[inset_0_1px_0_0_color:color-mix(in_srgb,var(--kali-panel)_55%,transparent)] transition focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--kali-control)_60%,transparent)] focus:ring-offset-2 focus:ring-offset-[var(--kali-bg)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "contact-email-error" : undefined}
                    aria-labelledby="contact-email-label"
                  />
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-[color:var(--kali-text-faint)]"
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
                  <FormError id="contact-email-error" className="mt-2" role="alert">
                    {emailError}
                  </FormError>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-[color:var(--kali-text)]"
                  id="contact-message-label"
                >
                  Message
                </label>
                <p className="text-xs text-[color:var(--kali-text-subtle)]">
                  Share objectives, timelines, and any sensitive details using
                  secure channels if needed.
                </p>
                <div className="relative">
                  <textarea
                    id="contact-message"
                    className="w-full rounded-lg border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-3 pl-11 text-[color:var(--kali-text)] shadow-inner shadow-[inset_0_1px_0_0_color:color-mix(in_srgb,var(--kali-panel)_55%,transparent)] transition focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--kali-control)_60%,transparent)] focus:ring-offset-2 focus:ring-offset-[var(--kali-bg)]"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    aria-invalid={!!messageError}
                    aria-describedby={messageError ? "contact-message-error" : undefined}
                    aria-labelledby="contact-message-label"
                  />
                  <svg
                    className="pointer-events-none absolute left-3 top-3 h-6 w-6 text-[color:var(--kali-text-faint)]"
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
                  <FormError id="contact-message-error" className="mt-2" role="alert">
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
            {error && <FormError role="alert">{error}</FormError>}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[color:var(--kali-control)] px-4 text-sm font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-[0_12px_38px_color-mix(in_srgb,var(--kali-control)_35%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_92%,var(--kali-text)_8%)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--kali-control)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send message"}
              </button>
              {submitting && (
                <div
                  role="progressbar"
                  aria-label="Sending message"
                  className="h-1 w-full overflow-hidden rounded bg-[color:color-mix(in_srgb,var(--kali-panel)_70%,transparent)]"
                >
                  <div className="h-full w-full origin-left animate-pulse bg-[color:var(--kali-control)]" />
                </div>
              )}
            </div>
          </form>
          <aside className="flex flex-col gap-6 rounded-xl border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-surface)_85%,transparent)] p-6 shadow-kali-panel">
            <section>
              <h2 className="text-lg font-semibold text-kali-primary">Response time</h2>
              <p className="mt-2 text-sm text-[color:var(--kali-text-muted)]">
                I typically reply within <span className="font-medium text-[color:var(--kali-text)]">24 hours</span>
                . Urgent inquiries are prioritized and receive a same-day
                acknowledgement.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-kali-primary">FAQs</h2>
              <ul className="mt-2 space-y-3 text-sm text-[color:var(--kali-text-muted)]">
                <li>
                  <span className="block font-medium text-[color:var(--kali-text)]">
                    Do you accept collaboration proposals?
                  </span>
                  Absolutely—share your idea and any timelines so I can plan the
                  next steps.
                </li>
                <li>
                  <span className="block font-medium text-[color:var(--kali-text)]">
                    What should I include?
                  </span>
                  Provide context, goals, and any relevant documentation to
                  speed up the conversation.
                </li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-kali-primary">
                Threat model checklist
              </h2>
              <ul className="mt-3 space-y-3 text-sm text-[color:var(--kali-text-muted)]">
                {threatChecklist.map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 rounded-lg border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-surface)_88%,transparent)] p-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--kali-control)_30%,transparent)] text-[color:var(--kali-control)]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 1.25a.75.75 0 0 1 .66.39l1.58 2.846 3.181.53a.75.75 0 0 1 .398 1.27l-2.32 2.34.525 3.264a.75.75 0 0 1-1.086.78L10 11.958l-2.938 1.758a.75.75 0 0 1-1.086-.78l.525-3.263-2.32-2.34a.75.75 0 0 1 .398-1.27l3.18-.53 1.582-2.847A.75.75 0 0 1 10 1.25Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium text-[color:var(--kali-text)]">{item.title}</p>
                      <p className="text-xs text-[color:var(--kali-text-subtle)]">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-kali-primary">Trust badges</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text-muted)]">
                <span className="rounded border border-[color:color-mix(in_srgb,var(--kali-control)_50%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_18%,transparent)] px-3 py-1 text-[color:var(--kali-control)]">
                  GDPR mindful
                </span>
                <span className="rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-[color:var(--kali-text-muted)]">
                  Security focused
                </span>
                <span className="rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-[color:var(--kali-text-muted)]">
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
