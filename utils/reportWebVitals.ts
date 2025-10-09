import ReactGA from 'react-ga4';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

const thresholds: Record<string, number> = {
  CLS: 0.1,
  FCP: 1800,
  FID: 100,
  INP: 200,
  LCP: 2500,
  TTFB: 600,
};

const DEFAULT_METRICS = ['LCP', 'INP', 'CLS'];

const parseList = (value?: string | null) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getEnabledMetrics = () => {
  const configured = parseList(process.env.NEXT_PUBLIC_WEB_VITALS_METRICS)
    .map((metric) => metric.toUpperCase());

  const metrics = configured.length > 0 ? configured : DEFAULT_METRICS;

  return metrics.filter((metric) => thresholds[metric] !== undefined);
};

const getAllowedEnvironments = () => {
  const configured = parseList(process.env.NEXT_PUBLIC_WEB_VITALS_ENVS).map((env) =>
    env.toLowerCase(),
  );

  return configured.length > 0 ? configured : ['preview'];
};

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
  const currentEnv = (
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'
  ).toLowerCase();
  const allowedEnvironments = getAllowedEnvironments();
  if (!allowedEnvironments.includes(currentEnv)) return;

  const enabledMetrics = getEnabledMetrics();
  if (!enabledMetrics.includes(name)) return;

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
