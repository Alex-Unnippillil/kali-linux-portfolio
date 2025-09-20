export const filterEventsByType = (events = [], activeType = 'All') => {
  if (activeType === 'All') {
    return events;
  }
  return events.filter((event) => event?.type === activeType);
};

export const buildTimelineMetrics = (events = []) => {
  const length = events.length;
  if (!length) {
    return {
      min: 0,
      max: 0,
      rangeMinutes: 1,
      times: new Float64Array(),
    };
  }
  const times = new Float64Array(length);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < length; i += 1) {
    const ts = new Date(events[i].timestamp).getTime();
    times[i] = ts;
    if (ts < min) min = ts;
    if (ts > max) max = ts;
  }
  if (!Number.isFinite(min)) {
    min = 0;
  }
  if (!Number.isFinite(max)) {
    max = min;
  }
  const spanMinutes = Math.max((max - min) / 60000, 1);
  return {
    min,
    max,
    rangeMinutes: spanMinutes,
    times,
  };
};

export const getTypeOptions = (events = []) => {
  const types = new Set();
  events.forEach((event) => {
    if (event?.type) {
      types.add(event.type);
    }
  });
  return ['All', ...Array.from(types).sort()];
};
