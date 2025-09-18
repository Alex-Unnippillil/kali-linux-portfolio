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
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};

export const logStartupToggle = (
  entryId: string,
  enabled: boolean,
  impactScore: number
): void => {
  logEvent({
    category: 'Startup Manager',
    action: enabled ? 'enable-entry' : 'disable-entry',
    label: entryId,
    value: Math.max(0, Math.round(impactScore)),
  });
};

export const logStartupDelayChange = (
  entryId: string,
  delaySeconds: number
): void => {
  logEvent({
    category: 'Startup Manager',
    action: 'set-delay',
    label: entryId,
    value: Math.max(0, Math.round(delaySeconds)),
  });
};

export const logStartupImpactSnapshot = (
  totalImpact: number,
  heavyDisabled: number
): void => {
  logEvent({
    category: 'Startup Manager',
    action: 'impact-snapshot',
    label: `heavy-disabled:${heavyDisabled}`,
    value: Math.max(0, Math.round(totalImpact)),
  });
};
