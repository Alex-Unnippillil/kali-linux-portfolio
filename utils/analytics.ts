type ReactGAClient = typeof import('react-ga4')['default'];

type EventInput = Parameters<ReactGAClient['event']>[0];

let analyticsClient: ReactGAClient | null = null;

export const setAnalyticsClient = (client: ReactGAClient | null): void => {
  analyticsClient = client;
};

export const isDoNotTrackEnabled = (): boolean => {
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return false;
  }

  const rawValues: Array<string | null | undefined> = [];

  if (typeof navigator !== 'undefined') {
    rawValues.push(navigator.doNotTrack, (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack);
  }
  if (typeof window !== 'undefined') {
    rawValues.push((window as typeof window & { doNotTrack?: string | null }).doNotTrack);
  }

  return rawValues
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase())
    .some((value) => value === '1' || value === 'yes' || value === 'true');
};

const safeEvent = (...args: Parameters<ReactGAClient['event']>): void => {
  if (!analyticsClient) return;

  try {
    const eventFn = analyticsClient.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

export const logEvent = (event: EventInput): void => {
  safeEvent(event);
};

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};
