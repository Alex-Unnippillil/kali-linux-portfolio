import { track } from '@vercel/analytics';
import { useReportWebVitals as useNextReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/utils/reportWebVitals';

const vitals = new Set(['LCP', 'CLS', 'INP']);

export default function useReportWebVitals(): void {
  useNextReportWebVitals((metric) => {
    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
    if (typeof window !== 'undefined' && window.localStorage.getItem('analytics-enabled') !== 'true') return;
    const { id, name, value } = metric;
    if (vitals.has(name)) {
      track(name, { id, value });
    }
    reportWebVitals({ id, name, value });
  });
}
