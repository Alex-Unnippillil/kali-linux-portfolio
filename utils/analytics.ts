import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];

export interface PowerSaverMetrics {
  activationCount: number;
  totalEstimatedMinutesGained: number;
  lastGainEstimate: number;
}

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

let powerSaverActivationCount = 0;
let totalPowerSaverGainMinutes = 0;
let lastPowerSaverGain = 0;

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

export const logPowerSaverChange = (
  enabled: boolean,
  estimatedGainMinutes?: number,
): void => {
  if (enabled) {
    powerSaverActivationCount += 1;
    if (typeof estimatedGainMinutes === 'number') {
      totalPowerSaverGainMinutes += estimatedGainMinutes;
      lastPowerSaverGain = estimatedGainMinutes;
    }
  } else {
    lastPowerSaverGain = 0;
  }

  const label =
    typeof estimatedGainMinutes === 'number'
      ? `Estimated gain ${estimatedGainMinutes} minutes`
      : undefined;
  const value =
    typeof estimatedGainMinutes === 'number'
      ? Math.round(estimatedGainMinutes)
      : undefined;

  logEvent({
    category: 'power-saver',
    action: enabled ? 'enabled' : 'disabled',
    label,
    value,
  });
};

export const getPowerSaverMetrics = (): PowerSaverMetrics => ({
  activationCount: powerSaverActivationCount,
  totalEstimatedMinutesGained: totalPowerSaverGainMinutes,
  lastGainEstimate: lastPowerSaverGain,
});

export const __resetPowerSaverMetrics = (): void => {
  powerSaverActivationCount = 0;
  totalPowerSaverGainMinutes = 0;
  lastPowerSaverGain = 0;
};
