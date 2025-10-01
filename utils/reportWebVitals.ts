import ReactGA from 'react-ga4';

import {
  getSchedulerStats,
  onSchedulerStats,
  type SchedulerStats,
} from './scheduler';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

const thresholds: Record<string, number> = {
  LCP: 2500,
  INP: 200,
};

const MAX_INP_SAMPLES = 120;
const inpSamples: number[] = [];

let schedulerStats: SchedulerStats | null = null;
let monitoringInitialised = false;

const initSchedulerMonitoring = (): void => {
  if (monitoringInitialised) return;
  monitoringInitialised = true;
  try {
    schedulerStats = getSchedulerStats();
    onSchedulerStats((stats) => {
      schedulerStats = stats;
    });
  } catch {
    schedulerStats = null;
  }
};

const computePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor((sorted.length - 1) * percentile),
  );
  return sorted[index];
};

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview') return;
  if (name !== 'LCP' && name !== 'INP') return;

  const rounded = Math.round(value);

  if (name === 'INP') {
    initSchedulerMonitoring();
    inpSamples.push(value);
    if (inpSamples.length > MAX_INP_SAMPLES) {
      inpSamples.shift();
    }
  }

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

  if (name === 'INP' && schedulerStats) {
    const p75 = computePercentile(inpSamples, 0.75);
    const activeBackground = schedulerStats.activeBackgroundTasks;
    if (activeBackground > 0) {
      const message = `INP p75 ${Math.round(p75)}ms with ${activeBackground} background tasks`;
      if (p75 > thresholds.INP) {
        ReactGA.event({
          category: 'Performance Alert',
          action: 'INP degraded during background work',
          label: message,
          value: Math.round(p75),
        });
        if (typeof console !== 'undefined') {
          console.warn(`[scheduler] ${message}`);
        }
      } else if (typeof console !== 'undefined') {
        console.info(`[scheduler] ${message}`);
      }
    }
  }
};

export default reportWebVitals;
