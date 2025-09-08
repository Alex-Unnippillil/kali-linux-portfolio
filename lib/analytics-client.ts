export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click';

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean>,
) {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  if (typeof window !== 'undefined' && window.localStorage.getItem('analytics-enabled') !== 'true') return;
  try {
    // Dynamically require to avoid ESM issues in test environment
    const { track } = require('@vercel/analytics');
    track(name, props);
  } catch {
    // ignore analytics errors
  }
}


