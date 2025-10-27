import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import emailjs from '@emailjs/browser';

import ProgressBar from '../ui/ProgressBar';
import { createDisplay } from '../../utils/createDynamicApp';
import { copyToClipboard } from '../../utils/clipboard';
import { openMailto } from '../../utils/mailto';
import { processContactForm } from './contact';
import { contactSchema } from '../../utils/contactSchema';

const EMAIL = 'alex.unnippillil@hotmail.com';

const ensureMetaToken = (token: string) => {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector('meta[name="csrf-token"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'csrf-token');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', token);
};

const getRecaptchaToken = (key: string): Promise<string> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve('');
    const g: any = (window as any).grecaptcha;
    if (!g || !key) return resolve('');
    g.ready(() => {
      g
        .execute(key, { action: 'submit' })
        .then((token: string) => resolve(token))
        .catch(() => resolve(''));
    });
  });

export const parseIdentity = (
  value: string
): { name: string; email: string; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { name: '', email: '', error: 'Contact information is required' };
  }

  const emailSchema = contactSchema.shape.email;

  const bracketMatch = trimmed.match(/<([^<>]+)>/);
  if (bracketMatch) {
    const candidate = bracketMatch[1].trim();
    const parsed = emailSchema.safeParse(candidate);
    if (parsed.success) {
      const namePart = trimmed.replace(bracketMatch[0], '').trim();
      return {
        name: namePart || parsed.data,
        email: parsed.data,
      };
    }
  }

  const parts = trimmed.split(/\s+/);
  for (const part of parts) {
    const parsed = emailSchema.safeParse(part);
    if (parsed.success) {
      const namePart = trimmed.replace(part, '').trim();
      return {
        name: namePart || parsed.data,
        email: parsed.data,
      };
    }
  }

  const direct = emailSchema.safeParse(trimmed);
  if (direct.success) {
    return { name: direct.data, email: direct.data };
  }

  return { name: '', email: '', error: 'Enter a valid email address' };
};

export const shouldUseEmailFallback = (
  result: { success: boolean; code?: string; error?: string } | null
) => {
  if (!result) return false;
  if (result.success) return false;
  const code = result.code || '';
  return (
    code === 'recaptcha_disabled' ||
    code === 'invalid_recaptcha' ||
    code === 'missing_tokens'
  );
};

type Status = { type: 'success' | 'error'; message: string } | null;

type LocationInfo = {
  latitude: number;
  longitude: number;
};

const buildMessage = (subject: string, message: string) => {
  const trimmedMessage = message.trim();
  if (!subject.trim()) return trimmedMessage;
  const prefix = `Subject: ${subject.trim()}\n\n`;
  const combined = `${prefix}${trimmedMessage}`;
  const parsed = contactSchema.shape.message.safeParse(combined);
  if (parsed.success) return parsed.data;
  return trimmedMessage;
};

export const Gedit: React.FC = () => {
  const emailConfig = useMemo(
    () => ({
      userId: process.env.NEXT_PUBLIC_USER_ID ?? '',
      serviceId: process.env.NEXT_PUBLIC_SERVICE_ID ?? '',
      templateId: process.env.NEXT_PUBLIC_TEMPLATE_ID ?? '',
    }),
    []
  );

  const emailJsFlag = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_ENABLE_GEDIT_EMAILJS || '').toLowerCase() ===
      'true',
    []
  );

  const emailJsConfigured = useMemo(
    () =>
      Boolean(
        emailJsFlag &&
          emailConfig.userId &&
          emailConfig.serviceId &&
          emailConfig.templateId
      ),
    [emailConfig, emailJsFlag]
  );

  const siteKey = useMemo(
    () => process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    []
  );

  const [identity, setIdentity] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [sending, setSending] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csrfToken, setCsrfToken] = useState('');
  const [fallback, setFallback] = useState(false);
  const [emailJsReady, setEmailJsReady] = useState(false);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [timezone, setTimezone] = useState('');
  const [localTime, setLocalTime] = useState('');

  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrame = useRef<number | null>(null);

  const resetProgress = useCallback(() => {
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
      progressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setShowProgress(false);
    setProgress(0);
  }, []);

  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await fetch('/api/contact');
      if (!res.ok) return '';
      const data = await res.json();
      if (data?.csrfToken) {
        ensureMetaToken(data.csrfToken);
        setCsrfToken(data.csrfToken);
        return data.csrfToken as string;
      }
    } catch {
      /* ignore */
    }
    return '';
  }, []);

  useEffect(() => {
    resetProgress();
    return () => {
      resetProgress();
      if (animationFrame.current && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [resetProgress]);

  useEffect(() => {
    if (!siteKey || typeof document === 'undefined') return;
    if (document.querySelector('script[data-gedit-recaptcha]')) return;
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.dataset.geditRecaptcha = 'true';
    document.head.appendChild(script);
  }, [siteKey]);

  useEffect(() => {
    if (!emailJsConfigured) return;
    try {
      emailjs.init(emailConfig.userId);
      setEmailJsReady(true);
    } catch {
      setEmailJsReady(false);
    }
  }, [emailJsConfigured, emailConfig.userId]);

  useEffect(() => {
    void fetchCsrfToken();
  }, [fetchCsrfToken]);

  useEffect(() => {
    if (typeof fetch === 'undefined') return;
    let cancelled = false;
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const { latitude, longitude, timezone: tz } = data || {};
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          setLocation({ latitude, longitude });
        }
        if (typeof tz === 'string') {
          setTimezone(tz);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!timezone || typeof window === 'undefined') return;
    const tick = () => {
      try {
        const formatter = new Intl.DateTimeFormat([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: timezone,
        });
        setLocalTime(formatter.format(new Date()));
      } catch {
        /* ignore */
      }
      animationFrame.current = window.requestAnimationFrame(tick);
    };
    animationFrame.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [timezone]);

  const messagePreview = useMemo(() => buildMessage(subject, message), [
    subject,
    message,
  ]);

  const handleSend = useCallback(async () => {
    if (sending) return;
    setStatus(null);
    setFallback(false);
    setIdentityError('');
    setMessageError('');

    const identityResult = parseIdentity(identity);
    if (identityResult.error) {
      setIdentityError(identityResult.error);
      return;
    }

    const messageResult = contactSchema.shape.message.safeParse(messagePreview);
    if (!messageResult.success) {
      setMessageError('Message must be 1-1000 characters');
      return;
    }

    setSending(true);
    resetProgress();
    progressTimer.current = setTimeout(() => {
      setShowProgress(true);
      progressInterval.current = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 95));
      }, 500);
    }, 10000);

    let token = csrfToken;
    if (!token) {
      token = await fetchCsrfToken();
    }

    if (!token) {
      setStatus({ type: 'error', message: 'Secure contact channel unavailable.' });
      setFallback(true);
      setSending(false);
      resetProgress();
      return;
    }

    const recaptchaToken = siteKey
      ? await getRecaptchaToken(siteKey)
      : '';

    const result = await processContactForm({
      name: identityResult.name,
      email: identityResult.email,
      message: messageResult.data,
      honeypot: '',
      csrfToken: token,
      recaptchaToken,
    });

    let finalStatus: Status = null;
    let usedEmailJs = false;

    if (result.success) {
      finalStatus = { type: 'success', message: 'Message sent' };
    } else if (emailJsReady && shouldUseEmailFallback(result)) {
      try {
        await emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
          name: identityResult.name,
          email: identityResult.email,
          subject: subject.trim(),
          message: message.trim(),
          'g-recaptcha-response': recaptchaToken,
        });
        finalStatus = {
          type: 'success',
          message: 'Message sent via EmailJS fallback',
        };
        usedEmailJs = true;
      } catch {
        finalStatus = {
          type: 'error',
          message: result.error || 'Submission failed',
        };
      }
      setFallback(true);
    } else {
      finalStatus = {
        type: 'error',
        message: result.error || 'Submission failed',
      };
      if (result.code === 'recaptcha_disabled' || result.code === 'invalid_recaptcha') {
        setFallback(true);
      }
    }

    setStatus(finalStatus);

    if (finalStatus?.type === 'success') {
      setIdentity('');
      setSubject('');
      setMessage('');
      ReactGA.event({
        category: 'contact',
        action: 'submit_success',
        label: usedEmailJs ? 'emailjs' : 'api',
      });
    }

    setProgress(100);
    setTimeout(() => {
      setSending(false);
      resetProgress();
    }, 300);
  }, [
    sending,
    identity,
    message,
    messagePreview,
    subject,
    csrfToken,
    emailJsReady,
    resetProgress,
    fetchCsrfToken,
    emailConfig,
    siteKey,
  ]);

  return (
    <div className="relative flex h-full w-full select-none flex-col bg-ub-cool-grey text-white">
      <div className="flex items-center justify-between border-b border-t border-blue-400 bg-ub-gedit-light bg-opacity-60 px-2 py-1 text-sm">
        <span className="font-bold">Send a Message to Me</span>
        <button
          type="button"
          onClick={handleSend}
          className="my-0.5 rounded border border-black bg-black bg-opacity-50 px-3 py-0.5 text-sm hover:bg-opacity-80"
        >
          Send
        </button>
      </div>
      {status && (
        <div
          className={`px-3 py-2 text-xs ${
            status.type === 'success'
              ? 'bg-emerald-700 bg-opacity-80'
              : 'bg-red-700 bg-opacity-80'
          }`}
        >
          {status.message}
        </div>
      )}
      <div className="windowMainScreen relative flex-grow bg-ub-gedit-dark font-normal">
        <div className="absolute left-0 top-0 h-full px-2 bg-ub-gedit-darker" aria-hidden="true" />
        <div className="relative p-2 space-y-2">
          <div className="relative">
            <label htmlFor="gedit-contact" className="sr-only">
              Your email (optionally include name)
            </label>
            <input
              id="gedit-contact"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              aria-invalid={Boolean(identityError)}
              aria-describedby={identityError ? 'gedit-contact-error' : undefined}
              aria-label="Your email or name"
              className={`w-full bg-transparent pl-6 pr-2 text-sm font-medium text-ubt-gedit-orange outline-none focus:bg-ub-gedit-light ${
                identityError
                  ? 'border border-red-500'
                  : identity
                  ? 'border border-emerald-500'
                  : ''
              }`}
              placeholder="Your Email (optionally Name <email@example.com>)"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              type="text"
            />
            <span className="absolute left-1 top-1/2 -translate-y-1/2 transform text-sm font-bold text-ubt-gedit-blue">
              1
            </span>
            {identityError && (
              <p id="gedit-contact-error" className="mt-1 text-xs text-red-400" aria-live="polite">
                {identityError}
              </p>
            )}
          </div>
          <div className="relative">
            <label htmlFor="gedit-subject" className="sr-only">
              Subject
            </label>
            <input
              id="gedit-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Subject"
              className="w-full bg-transparent pl-6 pr-2 text-sm text-ubt-gedit-blue outline-none focus:bg-ub-gedit-light"
              placeholder="Subject (optional)"
              spellCheck={false}
              autoComplete="off"
              type="text"
            />
            <span className="absolute left-1 top-1/2 -translate-y-1/2 transform text-sm font-bold text-ubt-gedit-blue">
              2
            </span>
          </div>
          <div className="relative">
            <label htmlFor="gedit-message" className="sr-only">
              Message
            </label>
            <textarea
              id="gedit-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'gedit-message-error' : undefined}
              aria-label="Message"
              className={`h-48 w-full resize-none bg-transparent pl-6 pr-2 text-sm tracking-wider outline-none focus:bg-ub-gedit-light ${
                messageError
                  ? 'border border-red-500'
                  : message
                  ? 'border border-emerald-500'
                  : ''
              }`}
              placeholder="Message"
              spellCheck={false}
            />
            <span className="absolute left-1 top-1 text-sm font-bold text-ubt-gedit-blue">
              3
            </span>
            {messageError && (
              <p id="gedit-message-error" className="mt-1 text-xs text-red-400" aria-live="polite">
                {messageError}
              </p>
            )}
          </div>
        </div>
      </div>
      {fallback && (
        <div className="space-y-2 border-t border-ubt-gedit-blue bg-ub-gedit-dark p-2 text-xs">
          <p className="font-semibold">Secure channel unavailable</p>
          <p>
            Copy your message or launch your email client instead.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyToClipboard(EMAIL)}
              className="rounded bg-ub-gedit-light px-2 py-1 text-xs text-black"
            >
              Copy address
            </button>
            <button
              type="button"
              onClick={() => void copyToClipboard(message || '')}
              className="rounded bg-ub-gedit-light px-2 py-1 text-xs text-black"
            >
              Copy message
            </button>
            <button
              type="button"
              onClick={() => openMailto(EMAIL, subject, message)}
              className="rounded bg-ub-gedit-light px-2 py-1 text-xs text-black"
            >
              Open email app
            </button>
          </div>
        </div>
      )}
      {location && (
        <div className="border-t border-b border-ubt-gedit-blue bg-ub-gedit-dark p-2">
          <h2 className="mb-1 text-sm font-bold">Your Local Time</h2>
          <Image
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${location.latitude},${location.longitude}&zoom=3&size=300x150&markers=${location.latitude},${location.longitude},red-dot`}
            alt="Map showing your approximate location"
            className="w-full rounded"
            width={300}
            height={150}
            sizes="(max-width: 300px) 100vw, 300px"
          />
          <p className="mt-2 text-center" aria-live="polite">
            {localTime}
          </p>
        </div>
      )}
      {sending && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-400 bg-opacity-30">
          {showProgress ? (
            <ProgressBar progress={progress} />
          ) : (
            <Image
              className="w-8 motion-safe:animate-spin"
              src="/themes/Yaru/status/process-working-symbolic.svg"
              alt="Ubuntu Process Symbol"
              width={32}
              height={32}
              sizes="32px"
              priority
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Gedit;
export const displayGedit = createDisplay(Gedit);
