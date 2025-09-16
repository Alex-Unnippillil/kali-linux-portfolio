import { trackEvent, GA_EVENTS } from '../lib/analytics';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

const thresholds: Record<string, number> = {
  LCP: 2500,
  INP: 200,
};

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (name !== 'LCP' && name !== 'INP') return;

  const rounded = Math.round(value);

  trackEvent(GA_EVENTS.WEB_VITALS.METRIC(name, id, rounded));

  const threshold = thresholds[name];
  if (threshold !== undefined && value > threshold) {
    trackEvent(GA_EVENTS.WEB_VITALS.ALERT(name, id, rounded));
    if (typeof console !== 'undefined') {
      console.warn(`Web Vitals alert: ${name} ${rounded}`);
    }
  }
};

export default reportWebVitals;
