'use client';

import { useCallback } from 'react';
import { useReportWebVitals } from 'next/web-vitals';

const formatMetricLabel = (label: string) => (label === 'web-vital' ? 'Web Vitals' : 'Next.js metric');

export default function WebVitals(): null {
  const reportMetric = useCallback<Parameters<typeof useReportWebVitals>[0]>((metric) => {
    if (typeof console === 'undefined') return;

    const { id, name, label, value, delta } = metric;
    const origin = formatMetricLabel(label);

    console.log(`[${origin}] ${name}`, {
      id,
      value: Number.isFinite(value) ? Number(value.toFixed(2)) : value,
      delta: Number.isFinite(delta) ? Number(delta.toFixed(2)) : delta,
      label,
    });
  }, []);

  useReportWebVitals(reportMetric);

  return null;
}
