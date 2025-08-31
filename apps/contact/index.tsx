"use client";

import React, { useEffect, useState } from "react";
import FormError from "../../components/ui/FormError";
import { processContactForm } from "../../components/apps/contact";
import { copyToClipboard } from "../../utils/clipboard";
import { openMailto } from "../../utils/mailto";
import { trackEvent } from "@/lib/analytics-client";
import { contactSchema } from "../../utils/contactSchema";

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
  const [purpose, setPurpose] = useState<"hiring" | "collaboration" | "speaking">("hiring");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [step, setStep] = useState(1);
  const totalSteps = 3;
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
        setPurpose(draft.purpose || "hiring");
      } catch {
        /* ignore */
      }
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    setCsrfToken(meta?.getAttribute("content") || "");
  }, []);

  useEffect(() => {
    const draft = { name, email, message, purpose };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, email, message, purpose]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    const res = contactSchema.shape.email.safeParse(e.target.value);
    setEmailError(res.success ? "" : "Invalid email");
  };

  const handleMessageChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMessage(e.target.value);
    const res = contactSchema.shape.message.safeParse(e.target.value);
    setMessageError(res.success ? "" : "1-1000 chars");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setMessageError("");
    const emailResult = contactSchema.shape.email.safeParse(email);
    const messageResult = contactSchema.shape.message.safeParse(message);
    if (!emailResult.success || !messageResult.success) {
      if (!emailResult.success) setEmailError("Invalid email");
      if (!messageResult.success) setMessageError("1-1000 chars");
      setError("Please fix the errors above");
      return;
    }
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
    const recaptchaToken = await getRecaptchaToken(siteKey);
    try {
      const result = await processContactForm({
        name,
        email,
        message,
        purpose,
        honeypot,
        csrfToken,
        recaptchaToken,
      });
      if (result.success) {
        setName("");
        setEmail("");
        setMessage("");
        setHoneypot("");
        localStorage.removeItem(DRAFT_KEY);
        trackEvent("contact_submit", { method: "form", purpose });
        setStep(3);
      } else {
        setError(result.error || "Submission failed");
        trackEvent("contact_submit_error", { method: "form", purpose });
      }
    } catch {
      setError("Submission failed");
      trackEvent("contact_submit_error", { method: "form", purpose });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="mb-4 text-2xl">Contact</h1>
      {step < 3 && (
        <>
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
          <div className="mb-6">
            <div className="mb-2 text-sm">Step {step} of {totalSteps}</div>
            <div className="h-2 bg-gray-700">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="space-y-4 max-w-md">
          <p className="text-sm">What&apos;s the purpose of your message?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="purpose"
                value="hiring"
                checked={purpose === "hiring"}
                onChange={(e) => setPurpose(e.target.value as any)}
              />
              Hiring
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="purpose"
                value="collaboration"
                checked={purpose === "collaboration"}
                onChange={(e) => setPurpose(e.target.value as any)}
              />
              Collaboration
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="purpose"
                value="speaking"
                checked={purpose === "speaking"}
                onChange={(e) => setPurpose(e.target.value as any)}
              />
              Speaking
            </label>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="rounded bg-blue-600 px-4 py-2"
          >
            Next
          </button>
        </div>
      )}
      {step === 2 && (
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
                onChange={handleEmailChange}
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "contact-email-error" : undefined}
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
              {emailError && (
                <FormError id="contact-email-error" className="mt-2">
                  {emailError}
                </FormError>
              )}
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
                onChange={handleMessageChange}
                required
                aria-invalid={!!messageError}
                aria-describedby={messageError ? "contact-message-error" : undefined}
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
              {messageError && (
                <FormError id="contact-message-error" className="mt-2">
                  {messageError}
                </FormError>
              )}
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded bg-gray-700 px-4 py-2"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 rounded bg-blue-600 px-4 py-2"
            >
              Send
            </button>
          </div>
        </form>
      )}
      {step === 3 && (
        <div className="space-y-4 max-w-md">
          <p className="text-lg text-green-500">Message sent!</p>
          <p>Next steps: let&apos;s schedule a meeting.</p>
          <a
            href="https://cal.com/kali"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400"
          >
            Book a meeting
          </a>
        </div>
      )}
    </div>
  );
};

export default ContactApp;
