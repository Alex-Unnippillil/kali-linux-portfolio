export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click'
  | 'terminal_exit_code_tip_shown'
  | 'terminal_exit_code_tip_dismissed'
  | 'terminal_exit_code_tip_link_clicked'
  | 'terminal_exit_code_tip_toggle';

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


