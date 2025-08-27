import ReactGA from 'react-ga4';

type EventParams = Record<string, any>;

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  try {
    if (typeof ReactGA?.event === 'function') {
      (ReactGA.event as any)(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

export const logEvent = (event: string, params?: EventParams): void => {
  safeEvent(event as any, params as any);
};

export const logGameStart = (id: string): void => {
  logEvent('game_start', { id });
};

export const logGameEnd = (id: string, label?: string): void => {
  logEvent('game_end', { id, label });
};

export const logGameError = (id: string, message?: string): void => {
  logEvent('game_error', { id, label: message });
};

export default { logEvent, logGameStart, logGameEnd, logGameError };
