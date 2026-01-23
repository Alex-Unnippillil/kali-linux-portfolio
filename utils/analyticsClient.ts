type ReactGAClient = typeof import('react-ga4').default;

export type AnalyticsEvent = Parameters<ReactGAClient['event']>[0];
export type AnalyticsPageview = Parameters<ReactGAClient['send']>[0];

const isAnalyticsEnabled = (): boolean => process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

let clientPromise: Promise<ReactGAClient | null> | null = null;
let hasInitialized = false;

const loadAnalyticsClient = async (): Promise<ReactGAClient | null> => {
  if (typeof window === 'undefined') return null;
  if (!isAnalyticsEnabled()) return null;

  if (!clientPromise) {
    clientPromise = import('react-ga4')
      .then((mod) => mod.default ?? mod)
      .catch(() => null);
  }
  return clientPromise;
};

export const initializeAnalytics = async (trackingId?: string): Promise<boolean> => {
  const id = trackingId ?? process.env.NEXT_PUBLIC_TRACKING_ID;
  if (!id) return false;
  const client = await loadAnalyticsClient();
  if (!client) return false;
  if (!hasInitialized) {
    client.initialize(id);
    hasInitialized = true;
  }
  return true;
};

const getAnalyticsClient = async (): Promise<ReactGAClient | null> => {
  const id = process.env.NEXT_PUBLIC_TRACKING_ID;
  if (!id) return null;
  const initialized = await initializeAnalytics(id);
  if (!initialized) return null;
  return loadAnalyticsClient();
};

const safeCall = (callback?: () => void): void => {
  if (!callback) return;
  try {
    callback();
  } catch {
    // ignore analytics errors
  }
};

export const trackEvent = (event: AnalyticsEvent): void => {
  void getAnalyticsClient().then((client) => {
    safeCall(() => client?.event(event));
  });
};

export const trackPageview = (payload: AnalyticsPageview): void => {
  void getAnalyticsClient().then((client) => {
    safeCall(() => client?.send(payload));
  });
};

export const resetAnalyticsClientForTesting = (): void => {
  if (process.env.NODE_ENV !== 'test') return;
  clientPromise = null;
  hasInitialized = false;
};
