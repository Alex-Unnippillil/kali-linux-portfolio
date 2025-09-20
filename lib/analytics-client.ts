export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click'
  | 'terminal_paste_detected'
  | 'terminal_paste_confirmed'
  | 'terminal_paste_cancelled'
  | 'terminal_paste_bypassed';

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean>,
) {
  try {
    // Dynamically require to avoid ESM issues in test environment
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { track } = require('@vercel/analytics');
    track(name, props);
  } catch {
    // ignore analytics errors
  }
}


