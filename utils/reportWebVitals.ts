import ReactGA from 'react-ga4';
import { track } from '@vercel/analytics';
import logger from './logger';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

const thresholds: Record<string, number> = {
  LCP: 2500,
  INP: 200,
  TTI: 5000,
};

const vitalNames = new Set(['TTFB', 'LCP', 'INP', 'CLS', 'TTI']);

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  if (typeof window !== 'undefined' && window.localStorage.getItem('analytics-enabled') !== 'true') return;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (!vitalNames.has(name)) return;

  const rounded = Math.round(name === 'CLS' ? value * 1000 : value);

  logger.log(`[Web Vitals] ${name} (${id}): ${rounded}`);

  ReactGA.event({
    category: 'Web Vitals',
    action: name,
    label: id,
    value: rounded,
    nonInteraction: true,
  });

  const threshold = thresholds[name];
  if (threshold !== undefined && value > threshold) {
    ReactGA.event({
      category: 'Performance Alert',
      action: `${name} degraded`,
      label: id,
      value: rounded,
    });
    track('web-vitals-alert', { name, id, value: rounded });
    if (typeof console !== 'undefined') {
      console.warn(`Web Vitals alert: ${name} ${rounded}`);
    }
  }
};

export default reportWebVitals;
