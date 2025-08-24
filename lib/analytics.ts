import { logEvent } from './axiom';
import type { NextWebVitalsMetric } from 'next/app';
import ReactGA from 'react-ga4';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

export const maskPII = (value: any): any => {
  if (typeof value === 'string') {
    return value.replace(EMAIL_REGEX, '[email]').replace(PHONE_REGEX, '[phone]');
  }
  if (Array.isArray(value)) {
    return value.map(maskPII);
  }
  if (value && typeof value === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      masked[key] = maskPII(val);
    }
    return masked;
  }
  return value;
};

export const trackEvent = async (
  type: string,
  params: Record<string, any> = {}
): Promise<void> => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  try {
    await logEvent({ type, ...maskPII(params) });
  } catch {
    // ignore logging errors
  }
};

export const trackWebVital = async (
  metric: NextWebVitalsMetric,
): Promise<void> => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  await trackEvent('web-vital', metric);
};

export const trackPageview = (page: string, title?: string): void => {
  if (
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' &&
    typeof window !== 'undefined' &&
    window.localStorage.getItem('analytics-consent') === 'granted'
  ) {
    ReactGA.send({ hitType: 'pageview', page, title });
  }
};

