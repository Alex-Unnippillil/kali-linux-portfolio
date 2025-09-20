import { performance } from 'perf_hooks';
import {
  buildTimelineMetrics,
  filterEventsByType,
} from '../components/apps/autopsy/timelineUtils';

describe('Autopsy timeline performance', () => {
  const events = Array.from({ length: 20000 }, (_, index) => {
    const typeIndex = index % 5;
    return {
      name: `event-${index}`,
      timestamp: new Date(2023, 0, 1, 0, index % 1440, index % 60).toISOString(),
      type: `type-${typeIndex}`,
    };
  });
  const sorted = events
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  it('filters events by type within 150ms', () => {
    const start = performance.now();
    const filtered = filterEventsByType(events, 'type-3');
    const duration = performance.now() - start;
    expect(filtered.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(150);
  });

  it('builds zoom metrics within 150ms', () => {
    const start = performance.now();
    const metrics = buildTimelineMetrics(sorted);
    const duration = performance.now() - start;
    expect(metrics.times.length).toBe(sorted.length);
    expect(metrics.rangeMinutes).toBeGreaterThan(0);
    expect(duration).toBeLessThan(150);
  });
});
