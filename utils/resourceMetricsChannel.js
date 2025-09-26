const listeners = new Set();

let latestSnapshot = {
  fps: 0,
  cpu: 0,
  memory: null,
  net: 0,
  updatedAt: 0,
  source: 'unknown',
};

export const getLatestResourceMetrics = () => latestSnapshot;

export const publishResourceMetrics = (partial) => {
  if (!partial || typeof partial !== 'object') {
    return;
  }

  latestSnapshot = {
    ...latestSnapshot,
    ...partial,
    updatedAt: partial.updatedAt ?? Date.now(),
  };

  listeners.forEach((listener) => {
    try {
      listener(latestSnapshot);
    } catch (error) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.error('Resource metrics listener failed', error);
      }
    }
  });
};

export const subscribeToResourceMetrics = (listener) => {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
};
