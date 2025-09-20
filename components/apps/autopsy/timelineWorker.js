import { buildTimelineMetrics } from './timelineUtils';

self.onmessage = (e) => {
  const { events = [] } = e.data || {};
  const sorted = events.slice().sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const metrics = buildTimelineMetrics(sorted);
  const { times, ...rest } = metrics;
  const transferable = times.length ? [times.buffer] : [];
  self.postMessage(
    {
      sorted,
      metrics: {
        ...rest,
        length: times.length,
        timesBuffer: times.buffer,
      },
    },
    transferable
  );
};
