'use client';

import { useReportWebVitals, type WebVitalsMetric } from 'next/web-vitals';

const RUM_ENDPOINT = '/api/rum';

const roundMetricValue = (metric: WebVitalsMetric) => {
  const precision = metric.name === 'CLS' ? 1000 : 100;
  return Math.round(metric.value * precision) / precision;
};

const sendMetric = (metric: WebVitalsMetric) => {
  if (typeof navigator === 'undefined' || !('sendBeacon' in navigator)) {
    return;
  }

  navigator.sendBeacon(RUM_ENDPOINT, JSON.stringify(metric));
};

export function WebVitals() {
  useReportWebVitals((metric) => {
    const roundedValue = roundMetricValue(metric);

    console.log(`[WebVitals] ${metric.name}`, roundedValue);
    sendMetric(metric);
  });

  return null;
}
