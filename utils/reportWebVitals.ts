import ReactGA from 'react-ga4';
import type { NextWebVitalsMetric } from 'next/app';

import { recordINPMetric } from './perf/marks';

type VitalName = Extract<NextWebVitalsMetric['name'], 'LCP' | 'INP'>;

const thresholds: Record<VitalName, number> = {
  LCP: 2500,
  INP: 200,
};

export const reportWebVitals = ({ id, name, value }: NextWebVitalsMetric): void => {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (name !== 'LCP' && name !== 'INP') return;

  const rounded = Math.round(value);

  ReactGA.event({
    category: 'Web Vitals',
    action: name,
    label: id,
    value: rounded,
    nonInteraction: true,
  });

  if (name === 'INP') {
    recordINPMetric(value, id);
  }

  const threshold = thresholds[name as VitalName];
  if (threshold !== undefined && value > threshold) {
    ReactGA.event({
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
