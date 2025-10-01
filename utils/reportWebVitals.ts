import ReactGA from 'react-ga4';
import { enqueueTelemetry } from './telemetry';

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
  const threshold = thresholds[name];

  ReactGA.event({
    category: 'Web Vitals',
    action: name,
    label: id,
    value: rounded,
    nonInteraction: true,
  });

  enqueueTelemetry('performance', {
    metric: name,
    value: rounded,
    metricId: id,
    threshold,
    aboveThreshold: threshold !== undefined ? value > threshold : false,
  });
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
