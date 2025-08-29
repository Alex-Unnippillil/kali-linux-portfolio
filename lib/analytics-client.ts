import { track } from '@vercel/analytics';

export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'outbound_link_click'
  | 'download_click';

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean>,
) {
  try {
    track(name, props);
  } catch {
    // ignore analytics errors
  }
}

