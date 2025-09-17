import { MAX_HISTORY, RUM_METRICS } from './constants';
import type { RumMetricName, RumSample, RumState } from './types';

const history: Record<RumMetricName, RumSample[]> = {
  INP: [],
  FID: [],
};

const listeners = new Set<() => void>();

function cloneHistory(): Record<RumMetricName, RumSample[]> {
  return {
    INP: [...history.INP],
    FID: [...history.FID],
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function addRumSample(sample: RumSample): void {
  const list = history[sample.name];
  const existingIndex = list.findIndex((item) => item.id === sample.id);
  if (existingIndex >= 0) {
    list[existingIndex] = sample;
  } else {
    list.push(sample);
  }
  list.sort((a, b) => a.timestamp - b.timestamp);
  if (list.length > MAX_HISTORY) {
    list.splice(0, list.length - MAX_HISTORY);
  }
  emit();
}

export function getRumState(): RumState {
  return {
    history: cloneHistory(),
  };
}

export function getServerRumState(): RumState {
  return {
    history: {
      INP: [],
      FID: [],
    },
  };
}

export function subscribeRum(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetRumStore(): void {
  RUM_METRICS.forEach((metric) => {
    history[metric] = [];
  });
  emit();
}
