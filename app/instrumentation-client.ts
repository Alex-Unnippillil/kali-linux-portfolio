export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  label?: string;
  startTime?: number;
  attribution?: Record<string, unknown>;
}

function buildPayload(metric: WebVitalsMetric) {
  const { id, name, value, label, startTime, attribution } = metric;
  const numericValue = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError('Metric value must be a finite number');
  }

  const cleanAttribution: Record<string, string | number> | undefined = (() => {
    if (!attribution || typeof attribution !== 'object') {
      return undefined;
    }

    const allowedKeys = [
      'event',
      'eventTarget',
      'eventType',
      'navigationType',
      'nextUrl',
      'previousUrl',
      'largestShiftTarget',
      'largestShiftValue',
      'rating',
      'timeToFirstByte',
    ];

    const sanitized: Record<string, string | number> = {};
    for (const key of allowedKeys) {
      const rawValue = (attribution as Record<string, unknown>)[key];
      if (typeof rawValue === 'string') {
        sanitized[key] = rawValue.slice(0, 200);
      } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        sanitized[key] = rawValue;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  })();

  return {
    id: String(id).slice(0, 100),
    name: String(name).slice(0, 50),
    value: numericValue,
    label: typeof label === 'string' ? label.slice(0, 50) : undefined,
    startTime: typeof startTime === 'number' && Number.isFinite(startTime)
      ? startTime
      : undefined,
    attribution: cleanAttribution,
    timestamp: Date.now(),
  };
}

export function reportWebVitals(metric: WebVitalsMetric): void {
  if (typeof navigator === 'undefined') return;

  try {
    const payload = buildPayload(metric);
    const body = JSON.stringify(payload);
    const url = '/rum';

    if (typeof navigator.sendBeacon === 'function') {
      const payload =
        typeof Blob === 'function'
          ? new Blob([body], { type: 'application/json' })
          : body;
      navigator.sendBeacon(url, payload);
      return;
    }

    if (typeof fetch === 'function') {
      fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // Swallow network errors – metrics are best effort.
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to report web vitals', error);
    }
  }
}

export default reportWebVitals;
