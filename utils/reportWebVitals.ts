import type { NextWebVitalsMetric } from 'next/app';
import { trackEvent } from './analyticsClient';

type VitalName = Extract<NextWebVitalsMetric['name'], 'LCP' | 'INP'>;

const thresholds: Record<VitalName, number> = {
  LCP: 2500,
  INP: 200,
};

export const reportWebVitals = ({ id, name, value }: NextWebVitalsMetric): void => {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  if (!process.env.NEXT_PUBLIC_TRACKING_ID) return;
  if (name !== 'LCP' && name !== 'INP') return;

  const rounded = Math.round(value);

  trackEvent({
    category: 'Web Vitals',
    action: name,
    label: id,
    value: rounded,
    nonInteraction: true,
  });

  const threshold = thresholds[name as VitalName];
  if (threshold !== undefined && value > threshold) {
    trackEvent({
      category: 'Performance Alert',
      action: `${name} degraded`,
      label: id,
      value: rounded,
    });
    if (typeof console !== 'undefined') {
      console.warn(`Web Vitals alert: ${name} ${rounded}`);
    }
  }
};

export default reportWebVitals;
