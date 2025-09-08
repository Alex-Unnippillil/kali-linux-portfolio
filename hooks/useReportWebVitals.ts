import { track } from '@vercel/analytics';
import { useReportWebVitals as useNextReportWebVitals } from 'next/web-vitals';
import { reportWebVitals } from '@/utils/reportWebVitals';

const vitals = new Set(['LCP', 'CLS', 'INP']);

export default function useReportWebVitals(): void {
  useNextReportWebVitals((metric) => {
    const { id, name, value } = metric;
    if (name === 'CLS') {
      // Log CLS to monitor layout stability
      console.log('[Web Vitals] CLS:', value);
    }
    if (vitals.has(name)) {
      track(name, { id, value });
    }
    reportWebVitals({ id, name, value });
  });
}
