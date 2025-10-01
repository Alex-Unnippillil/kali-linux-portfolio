import ReactGA from 'react-ga4';
import {
  getSampleRateForMetric,
  getWebVitalsClientId,
  getWebVitalsConfig,
  isClientAllowlisted,
  isRouteAllowlisted,
  WebVitalMetricName,
} from './webVitalsConfig';

interface WebVitalMetric {
  id: string;
  name: WebVitalMetricName;
  value: number;
}

const trackedMetrics = new Set<WebVitalMetricName>(['LCP', 'INP']);

const thresholds: Partial<Record<WebVitalMetricName, number>> = {
  LCP: 2500,
  INP: 200,
};

const getCurrentPathname = (): string => {
  if (typeof window === 'undefined' || !window.location) return '';
  return window.location.pathname;
};

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (!trackedMetrics.has(name)) return;

  const config = getWebVitalsConfig();
  const pathname = getCurrentPathname();
  const clientId = getWebVitalsClientId();
  const allowlistedRoute = pathname
    ? isRouteAllowlisted(pathname, config.allowRoutes)
    : false;
  const allowlistedClient = clientId !== 'server' && isClientAllowlisted(clientId, config.allowClients);
  const sampleRate = getSampleRateForMetric(name, config);

  if (!allowlistedRoute && !allowlistedClient) {
    if (sampleRate <= 0) return;
    if (Math.random() >= sampleRate) return;
  }

  const rounded = Math.round(value);

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
    if (typeof console !== 'undefined') {
      console.warn(`Web Vitals alert: ${name} ${rounded}`);
    }
  }
};

export default reportWebVitals;
