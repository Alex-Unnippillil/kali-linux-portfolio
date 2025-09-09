import ReactGA from 'react-ga4';

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

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  const event: EventInput = label
    ? { category: game, action: 'end', label }
    : { category: game, action: 'end' };
  logEvent(event);
};

export const logGameError = (game: string, message?: string): void => {
  const event: EventInput = message
    ? { category: game, action: 'error', label: message }
    : { category: game, action: 'error' };
  logEvent(event);
};
