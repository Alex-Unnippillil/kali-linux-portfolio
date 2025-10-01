import type GA4Instance from 'react-ga4/dist/ga4';

/**
 * Determines whether client-side analytics should run. The proxy never
 * initializes Google Analytics unless this flag resolves truthy so builds
 * without analytics stay lean.
 */
const analyticsEnabled = (() => {
  if (typeof window === 'undefined') return false;
  const enableFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  if (enableFlag === 'true') return true;
  if (enableFlag === 'false') return false;
  const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
  return typeof trackingId === 'string' && trackingId.length > 0;
})();

let instance: GA4Instance | null = null;
let loadPromise: Promise<GA4Instance | null> | null = null;
const queue: Array<(ga: GA4Instance) => void> = [];

const warn = (error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[analytics] Failed to execute GA call', error);
  }
};

const flushQueue = (ga: GA4Instance) => {
  while (queue.length) {
    const task = queue.shift();
    if (!task) continue;
    try {
      task(ga);
    } catch (error) {
      warn(error);
    }
  }
};

const loadInstance = async (): Promise<GA4Instance | null> => {
  if (!analyticsEnabled) return null;
  if (instance) return instance;
  if (!loadPromise) {
    loadPromise = import('react-ga4/dist/index.js')
      .then((mod) => {
        const loaded = (mod as { default?: GA4Instance }).default ?? (mod as unknown as GA4Instance);
        if (loaded) {
          instance = loaded;
          flushQueue(loaded);
          return loaded;
        }
        return null;
      })
      .catch((error) => {
        warn(error);
        return null;
      });
  }
  return loadPromise;
};

const enqueue = (callback: (ga: GA4Instance) => void): void => {
  if (!analyticsEnabled) return;
  if (instance) {
    try {
      callback(instance);
    } catch (error) {
      warn(error);
    }
    return;
  }
  queue.push(callback);
  void loadInstance();
};

const invokeMethod = (name: keyof GA4Instance | string) =>
  (...args: unknown[]): void => {
    enqueue((ga) => {
      const target = (ga as Record<string | symbol, unknown>)[name as keyof GA4Instance];
      if (typeof target === 'function') {
        try {
          (target as (...methodArgs: unknown[]) => void)(...args);
        } catch (error) {
          warn(error);
        }
      }
    });
  };

const valueProps = new Set<keyof GA4Instance>([
  'isInitialized',
  '_currentMeasurementId',
  '_queueGtag',
  '_hasLoadedGA',
  '_isQueuing',
  '_testMode',
]);

const readValue = (prop: keyof GA4Instance): unknown => {
  if (!instance) {
    if (prop === 'isInitialized') return false;
    if (prop === '_queueGtag') return [];
    return undefined;
  }
  return instance[prop];
};

const proxy = new Proxy<GA4Instance & { [key: string]: unknown }>(
  {} as GA4Instance,
  {
    get(_target, prop: keyof GA4Instance | 'ReactGAImplementation' | symbol) {
      if (prop === Symbol.toStringTag) return 'Module';
      if (prop === '__esModule') return false;
      if (prop === 'ReactGAImplementation') return null;
      if (typeof prop === 'string' && valueProps.has(prop as keyof GA4Instance)) {
        return readValue(prop as keyof GA4Instance);
      }
      if (typeof prop === 'string') {
        return invokeMethod(prop);
      }
      return undefined;
    },
    set(_target, prop: keyof GA4Instance | string | symbol, value: unknown) {
      if (!analyticsEnabled) return true;
      enqueue((ga) => {
        (ga as Record<string | symbol, unknown>)[prop] = value;
      });
      return true;
    },
  }
);

export default proxy;
export const ReactGAImplementation = null;
export const __unsafeLoadAnalyticsForTests = loadInstance;
