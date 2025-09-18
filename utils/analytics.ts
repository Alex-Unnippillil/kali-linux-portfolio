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

export const logPackageInstallCompleted = (
  packageId: string,
  durationMs: number,
): void => {
  logEvent({
    category: 'package_manager',
    action: 'install_complete',
    label: packageId,
    value: Math.round(durationMs),
  });
};

export const logPackageInstallAborted = (
  packageId: string,
  reason: string,
  durationMs?: number,
): void => {
  const event: EventInput = {
    category: 'package_manager',
    action: 'install_aborted',
    label: `${packageId}:${reason}`,
  };

  if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
    event.value = Math.round(durationMs);
  }

  logEvent(event);
};
