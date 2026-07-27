import { getRating } from './ratings';
import { addRumSample } from './store';
import type { RumSample } from './types';

let started = false;

const timeOrigin = (() => {
  if (typeof performance === 'undefined') return Date.now();
  return performance.timeOrigin || performance.timing?.navigationStart || Date.now();
})();

function describeTarget(target: EventTarget | null): string | undefined {
  if (!target) return undefined;
  if (!(target instanceof Element)) return undefined;
  const parts: string[] = [target.tagName.toLowerCase()];
  if (target.id) {
    parts.push(`#${target.id}`);
  }
  if (target.classList?.length) {
    const classes = Array.from(target.classList)
      .slice(0, 2)
      .map((cls) => `.${cls}`);
    parts.push(...classes);
  }
  return parts.join('');
}

function recordSample(sample: RumSample): void {
  addRumSample(sample);
}

function observeFirstInput(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  const supported = (PerformanceObserver as any).supportedEntryTypes as string[] | undefined;
  if (supported && !supported.includes('first-input')) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const entry = entries[entries.length - 1] as PerformanceEventTiming | undefined;
      if (!entry) return;
      const value = entry.processingStart - entry.startTime;
      if (!Number.isFinite(value) || value < 0) return;
      const sample: RumSample = {
        id: `FID-${Math.round(entry.startTime)}`,
        name: 'FID',
        value,
        rating: getRating('FID', value),
        timestamp: timeOrigin + entry.startTime,
        attribution: {
          eventType: entry.name,
          target: describeTarget((entry as any).target ?? null),
        },
      };
      recordSample(sample);
      observer.disconnect();
    });
    observer.observe({ type: 'first-input', buffered: true } as PerformanceObserverInit);
  } catch {
    // noop
  }
}

function observeInp(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  const supported = (PerformanceObserver as any).supportedEntryTypes as string[] | undefined;
  if (supported && !supported.includes('event')) return;

  const bestByInteraction = new Map<number, RumSample>();

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const event = entry as PerformanceEventTiming;
        const interactionId = (event as any).interactionId as number | undefined;
        if (!interactionId || interactionId <= 0) return;
        const duration = event.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;
        const sample: RumSample = {
          id: `INP-${interactionId}`,
          name: 'INP',
          value: duration,
          rating: getRating('INP', duration),
          timestamp: timeOrigin + event.startTime,
          attribution: {
            eventType: event.name,
            target: describeTarget((event as any).target ?? null),
            interactionId,
          },
        };
        const previous = bestByInteraction.get(interactionId);
        if (!previous || duration >= previous.value) {
          bestByInteraction.set(interactionId, sample);
          recordSample(sample);
        }
      });
    });
    observer.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  } catch {
    // noop
  }
}

export function startRumSession(): void {
  if (started) return;
  started = true;
  if (typeof window === 'undefined') return;
  observeFirstInput();
  observeInp();
}
