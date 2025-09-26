export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click';

let analyticsModulePromise: Promise<typeof import('@vercel/analytics')> | null = null;

function loadAnalyticsModule() {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import('@vercel/analytics');
  }
  return analyticsModulePromise;
}

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean>,
) {
  loadAnalyticsModule()
    .then((mod) => {
      if (typeof mod.track === 'function') {
        mod.track(name, props);
      }
    })
    .catch(() => {
      // ignore analytics errors
    });
}


