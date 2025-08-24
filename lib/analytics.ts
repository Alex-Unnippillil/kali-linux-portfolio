import { logEvent } from './axiom';

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
  try {
    await logEvent({ type, ...maskPII(params) });
  } catch {
    // ignore logging errors
  }
};

