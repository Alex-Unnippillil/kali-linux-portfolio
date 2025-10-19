import ReactGA from 'react-ga4';
import { getAttributionMetadata } from './attribution';

type EventInput = Parameters<typeof ReactGA.event>[0];

type EventWithAttribution = EventInput & {
  attribution?: ReturnType<typeof getAttributionMetadata>;
};

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
  const attribution = getAttributionMetadata();
  const enriched: EventWithAttribution = attribution ? { ...event, attribution } : event;
  safeEvent(enriched);
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
