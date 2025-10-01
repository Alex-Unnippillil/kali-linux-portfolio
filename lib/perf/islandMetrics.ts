interface IslandHydrationInput {
  name: string;
  start: number;
  end: number;
}

interface IslandMetricRecord {
  name: string;
  route: string;
  hydrationDuration: number;
  startedAt: number;
  completedAt: number;
  improvement?: number;
  baseline?: number;
}

type IslandMetricStore = {
  samples: IslandMetricRecord[];
  latest: Record<string, IslandMetricRecord>;
};

const getStore = (): IslandMetricStore => {
  if (typeof window === 'undefined') {
    return { samples: [], latest: {} };
  }
  const globalObject = window as typeof window & {
    __ISLAND_METRICS__?: IslandMetricStore;
  };
  if (!globalObject.__ISLAND_METRICS__) {
    globalObject.__ISLAND_METRICS__ = { samples: [], latest: {} };
  }
  return globalObject.__ISLAND_METRICS__;
};

const updateStore = (store: IslandMetricStore) => {
  if (typeof window === 'undefined') return;
  (window as typeof window & { __ISLAND_METRICS__?: IslandMetricStore }).__ISLAND_METRICS__ = store;
};

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export const reportIslandHydrated = ({ name, start, end }: IslandHydrationInput) => {
  if (typeof window === 'undefined') return;

  const duration = Math.max(0, end - start);
  const route = window.location.pathname;
  const store = getStore();

  const metric: IslandMetricRecord = {
    name,
    route,
    hydrationDuration: duration,
    startedAt: start,
    completedAt: end,
  };

  const latestForIsland = store.latest?.[name];
  if (latestForIsland && latestForIsland.hydrationDuration > 0) {
    metric.improvement =
      ((latestForIsland.hydrationDuration - duration) / latestForIsland.hydrationDuration) * 100;
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const key = `island-metric:${name}`;
      const baseline = toPositiveNumber(sessionStorage.getItem(key));
      if (baseline) {
        metric.baseline = baseline;
        metric.improvement = ((baseline - duration) / baseline) * 100;
        if (duration < baseline) {
          sessionStorage.setItem(key, String(duration));
        }
      } else {
        sessionStorage.setItem(key, String(duration));
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('island-metrics: sessionStorage unavailable', error);
    }
  }

  store.samples.push(metric);
  store.latest = { ...store.latest, [name]: metric };
  updateStore(store);

  if (typeof performance !== 'undefined' && 'measure' in performance) {
    try {
      performance.measure(`${name}-hydration`, { start, end });
    } catch {
      // Ignore browsers that do not support the mark options signature.
    }
  }

  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('island-hydrated', { detail: metric }));
  }

  if (process.env.NODE_ENV !== 'production') {
    const improvementText =
      metric.improvement != null && Number.isFinite(metric.improvement)
        ? ` (${metric.improvement >= 0 ? '+' : ''}${metric.improvement.toFixed(1)}% vs baseline)`
        : '';
    console.info(
      `[island-metrics] ${name} hydrated in ${duration.toFixed(0)}ms${improvementText}`,
      metric,
    );
  }
};

export type { IslandMetricRecord };
