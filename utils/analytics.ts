import ReactGA from 'react-ga4';

type EventArgs = Parameters<typeof ReactGA.event>;
type EventInput = EventArgs[0];

let analyticsReady = false;
const eventQueue: EventArgs[] = [];

const safeEvent = (...args: EventArgs): void => {
  try {
    const eventFn = ReactGA.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

const drainQueue = (): void => {
  if (!analyticsReady) return;

  while (eventQueue.length > 0) {
    const args = eventQueue.shift();
    if (args) {
      safeEvent(...args);
    }
  }
};

export const signalAnalyticsReady = (): void => {
  if (analyticsReady) return;

  analyticsReady = true;
  drainQueue();
};

export const logEvent = (event: EventInput): void => {
  if (!analyticsReady) {
    eventQueue.push([event]);
    return;
  }

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
