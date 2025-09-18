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

const VAULT_CATEGORY = 'credentials-vault';

export const logVaultCopy = (label: string): void => {
  logEvent({ category: VAULT_CATEGORY, action: 'copy', label });
};

export const logVaultAutoClear = (): void => {
  logEvent({ category: VAULT_CATEGORY, action: 'auto-clear' });
};

export const logVaultUnlockFailure = (label?: string): void => {
  logEvent({ category: VAULT_CATEGORY, action: 'unlock-failure', label });
};
