import ReactGA from 'react-ga4';

import { safeSessionStorage } from './safeStorage';

type EventInput = Parameters<typeof ReactGA.event>[0];

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  try {
    const eventFn = ReactGA.event;
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

const EXPOSURE_STORAGE_KEY = 'experiments:exposures';

const memoryExposureSet = new Set<string>();

let cachedExposureSet: Set<string> | undefined;

const loadExposureSet = (): Set<string> => {
  if (cachedExposureSet) {
    return cachedExposureSet;
  }

  const storage = safeSessionStorage;
  if (!storage) {
    cachedExposureSet = memoryExposureSet;
    return cachedExposureSet;
  }

  try {
    const stored = storage.getItem(EXPOSURE_STORAGE_KEY);
    if (!stored) {
      cachedExposureSet = new Set<string>();
      return cachedExposureSet;
    }

    const parsed = JSON.parse(stored) as string[];
    cachedExposureSet = new Set(parsed);
    return cachedExposureSet;
  } catch {
    cachedExposureSet = new Set<string>();
    return cachedExposureSet;
  }
};

const persistExposureSet = (): void => {
  const storage = safeSessionStorage;
  if (!storage || !cachedExposureSet) {
    return;
  }

  try {
    storage.setItem(EXPOSURE_STORAGE_KEY, JSON.stringify([...cachedExposureSet]));
  } catch {
    // Ignore storage failures
  }
};

const rememberExposure = (experimentId: string): boolean => {
  const exposures = loadExposureSet();
  if (exposures.has(experimentId)) {
    return false;
  }

  exposures.add(experimentId);
  persistExposureSet();
  return true;
};

export const logExperimentExposure = (experimentId: string, variantId: string): void => {
  if (!rememberExposure(experimentId)) {
    return;
  }

  logEvent({
    category: `experiment:${experimentId}`,
    action: 'exposure',
    label: variantId,
    nonInteraction: true,
  } as EventInput);
};

export const __resetExperimentExposureCache = (): void => {
  cachedExposureSet = undefined;
  memoryExposureSet.clear();
  try {
    safeSessionStorage?.removeItem(EXPOSURE_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
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
