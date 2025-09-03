export type EventName =
  | 'cta_click'
  | 'signup_submit'
  | 'contact_submit'
  | 'contact_submit_error'
  | 'outbound_link_click'
  | 'download_click'
  | 'Ask Agent'
  | 'Accepted Edit'
  | 'Compare Terms';
const getSampleRate = () => {
  const rate = parseFloat(process.env.NEXT_PUBLIC_ANALYTICS_SAMPLE_RATE || '1');
  if (Number.isNaN(rate)) return 1;
  return Math.min(1, Math.max(0, rate));
};

const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

const anonymizeProps = (
  props?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> | undefined => {
  if (!props) return undefined;
  const result: Record<string, string | number | boolean> = {};
  Object.entries(props).forEach(([key, value]) => {
    result[key] = typeof value === 'string' ? hashString(value) : value;
  });
  return result;
};

export function trackEvent(
  name: EventName,
  props?: Record<string, string | number | boolean>,
) {
  if (Math.random() >= getSampleRate()) return;
  try {
    // Dynamically require to avoid ESM issues in test environment
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { track } = require('@vercel/analytics');
    track(name, anonymizeProps(props));
  } catch {
    // ignore analytics errors
  }
}


