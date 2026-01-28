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
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const ReactGA = require('react-ga4');
    if (ReactGA?.event) {
      ReactGA.event({ category: 'interaction', action: name, ...props });
    }
  } catch {
    // ignore analytics errors
  }
}

