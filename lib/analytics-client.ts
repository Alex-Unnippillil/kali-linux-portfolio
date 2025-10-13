export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click'
  | 'wm_open'
  | 'wm_close'
  | 'wm_minimize'
  | 'wm_maximize'
  | 'wm_restore'
  | 'wm_snap'
  | 'wm_drag_end'
  | 'wm_resize_end';

const normalizeBoolean = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const isAnalyticsEnabled = (): boolean =>
  normalizeBoolean(process.env.NEXT_PUBLIC_ENABLE_ANALYTICS);

const sanitizeProps = (
  props?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> | undefined => {
  if (!props) {
    return undefined;
  }

  const entries = Object.entries(props).reduce<
    Record<string, string | number | boolean>
  >((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    if (value === null) {
      acc[key] = 'unknown';
      return acc;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return Object.keys(entries).length ? entries : undefined;
};

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  try {
    // Dynamically require to avoid ESM issues in test environment
    const { track } = require('@vercel/analytics');
    track(name, sanitizeProps(props));
  } catch {
    // ignore analytics errors
  }
}


