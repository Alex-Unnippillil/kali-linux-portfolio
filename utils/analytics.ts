import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const DIGIT_SEQUENCE = /\b\d{9,}\b/g;

const contactSessionKey = 'analytics:contact:sid';

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  try {
    const eventFn = ReactGA.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

const sanitizeString = (value: string): string => {
  const trimmed = value.trim().replaceAll('\n', ' ');
  const maskedEmails = trimmed.replace(EMAIL_PATTERN, '[email]');
  const maskedDigits = maskedEmails.replace(DIGIT_SEQUENCE, '[redacted]');
  return maskedDigits.replace(/[^\w\s\-:|.=]/g, '').slice(0, 150);
};

const sanitizeEvent = (event: EventInput): EventInput => {
  const sanitized: EventInput = {
    category: sanitizeString(event.category ?? ''),
    action: sanitizeString(event.action ?? ''),
  };

  if (!sanitized.category || !sanitized.action) {
    return sanitized;
  }

  if (event.label) {
    const label = sanitizeString(String(event.label));
    if (label) sanitized.label = label;
  }

  if (typeof event.value === 'number' && Number.isFinite(event.value)) {
    sanitized.value = event.value;
  }

  if (typeof event.nonInteraction !== 'undefined') {
    sanitized.nonInteraction = Boolean(event.nonInteraction);
  }

  return sanitized;
};

const serializeDetails = (
  details?: Record<string, string | number | boolean>,
): string | undefined => {
  if (!details) return undefined;
  const entries = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [sanitizeString(key), value] as const)
    .filter(([key]) => Boolean(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const formattedValue = sanitizeString(String(value));
      return `${key}=${formattedValue}`;
    });

  if (!entries.length) return undefined;
  return entries.join(';');
};

const getSessionScopedId = (key: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const storage = window.sessionStorage;
    const existing = storage.getItem(key);
    if (existing) return sanitizeString(existing);
    const id = `sid_${Math.random().toString(36).slice(2, 10)}`;
    storage.setItem(key, id);
    return id;
  } catch {
    return undefined;
  }
};

export const logEvent = (event: EventInput): void => {
  const sanitizedEvent = sanitizeEvent(event);
  if (!sanitizedEvent.category || !sanitizedEvent.action) return;
  safeEvent(sanitizedEvent);
};

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};

export type ContactFunnelStep =
  | 'view_contact_entry'
  | 'form_started'
  | 'validation_error'
  | 'captcha_error'
  | 'fallback_presented'
  | 'submission_success'
  | 'submission_failure'
  | 'cta_copy_email'
  | 'cta_open_mail_client'
  | 'cta_copy_message'
  | 'attachment_added'
  | 'attachment_removed'
  | 'attachment_rejected'
  | 'draft_restored'
  | 'draft_cleared';

type ContactDetails = Record<string, string | number | boolean>;

const withSessionId = (
  details: ContactDetails = {},
): ContactDetails => {
  const sessionId = getSessionScopedId(contactSessionKey);
  if (!sessionId) return details;
  return { ...details, sid: sessionId };
};

export const logContactFunnelStep = (
  step: ContactFunnelStep,
  details?: ContactDetails,
): void => {
  const label = serializeDetails(withSessionId(details ?? {}));
  logEvent({ category: 'contact_funnel', action: step, label });
};

export const CONTACT_FUNNEL_STEPS: ContactFunnelStep[] = [
  'view_contact_entry',
  'form_started',
  'submission_success',
];
