import ReactGA from 'react-ga4';
import type { PushNotificationInput } from '../components/common/NotificationCenter';

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

type NotificationClient = {
  pushNotification: (input: PushNotificationInput) => string;
};

const thresholds: Record<string, number> = {
  LCP: 2500,
  INP: 200,
};

let notificationClient: NotificationClient | null = null;

export const setWebVitalsNotificationClient = (
  client: NotificationClient | null,
): void => {
  notificationClient = client;
};

export const reportWebVitals = ({ id, name, value }: WebVitalMetric): void => {
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

  const threshold = thresholds[name];
  if (threshold !== undefined && value > threshold) {
    ReactGA.event({
      category: 'Performance Alert',
      action: `${name} degraded`,
      label: id,
      value: rounded,
    });
    notificationClient?.pushNotification({
      appId: 'system-monitor',
      title: `${name} performance warning`,
      body: `${name} recorded ${rounded}ms (threshold ${threshold}ms).`,
      priority: 'high',
      hints: {
        'x-kali-priority': 'high',
        metric: name,
        metricValue: rounded,
        metricThreshold: threshold,
      },
    });
    if (typeof console !== 'undefined') {
      console.warn(`Web Vitals alert: ${name} ${rounded}`);
    }
  }
};

export default reportWebVitals;
