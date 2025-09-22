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
  void import('@vercel/analytics')
    .then(({ track }) => {
      track(name, props);
    })
    .catch(() => {
      // ignore analytics errors
    });
}


