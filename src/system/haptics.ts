export type VibratePattern = number | number[];

type NavigatorWithGamepads = Navigator & {
  getGamepads?: () => (Gamepad | null)[] | null;
};

type MaybeHapticActuator = Partial<GamepadHapticActuator> & {
  pulse?: (value: number, duration: number) => Promise<unknown> | boolean;
};

const isBrowser = () => typeof navigator !== 'undefined';

const getNavigator = (): NavigatorWithGamepads | undefined => {
  if (!isBrowser()) return undefined;
  return navigator as NavigatorWithGamepads;
};

const getGamepads = (nav: NavigatorWithGamepads): (Gamepad | null)[] => {
  if (typeof nav.getGamepads !== 'function') return [];

  try {
    return nav.getGamepads() ?? [];
  } catch {
    return [];
  }
};

const swallowPromise = (value: unknown) => {
  if (!value) return;
  const maybePromise = value as Promise<unknown>;
  if (typeof maybePromise.catch === 'function') {
    maybePromise.catch(() => undefined);
  }
};

const getPatternDuration = (pattern: VibratePattern): number => {
  if (Array.isArray(pattern)) {
    return pattern.reduce(
      (total, segment) => (segment > 0 ? total + segment : total),
      0
    );
  }

  return pattern > 0 ? pattern : 0;
};

export const supportsVibration = (): boolean => {
  const nav = getNavigator();
  return !!nav && typeof nav.vibrate === 'function';
};

export const supportsGamepadVibration = (): boolean => {
  const nav = getNavigator();
  if (!nav) return false;

  return getGamepads(nav).some((pad) => {
    if (!pad) return false;
    const actuator = (pad as Gamepad & {
      vibrationActuator?: MaybeHapticActuator;
    }).vibrationActuator;
    if (!actuator) return false;
    const { playEffect, pulse } = actuator;
    return typeof playEffect === 'function' || typeof pulse === 'function';
  });
};

const triggerGamepadVibration = (duration: number) => {
  if (duration <= 0) return;

  const nav = getNavigator();
  if (!nav) return;

  getGamepads(nav).forEach((pad) => {
    if (!pad) return;
    const actuator = (pad as Gamepad & {
      vibrationActuator?: MaybeHapticActuator;
    }).vibrationActuator;
    if (!actuator) return;

    const { playEffect, pulse } = actuator;

    if (typeof playEffect === 'function') {
      const result = playEffect.call(actuator, 'dual-rumble', {
        duration,
        startDelay: 0,
        strongMagnitude: 1,
        weakMagnitude: 1,
      });
      swallowPromise(result);
      return;
    }

    if (typeof pulse === 'function') {
      swallowPromise(pulse.call(actuator, 1, duration));
    }
  });
};

export const vibrate = (pattern: VibratePattern): boolean => {
  const duration = getPatternDuration(pattern);
  triggerGamepadVibration(duration);

  if (!supportsVibration()) return false;

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

const trigger = (pattern: VibratePattern) => () => vibrate(pattern);

const definedPatterns = {
  selection: 15,
  lightImpact: 25,
  mediumImpact: [30, 20, 30],
  heavyImpact: [40, 30, 40],
  success: [20, 30, 20, 30, 20],
  warning: [30, 40, 30, 40, 30],
  error: [60, 30, 60],
  score: [20],
  danger: [40, 80, 40],
  gameOver: [100, 30, 100],
  stop: 0,
} as const;

export const patterns: { [K in keyof typeof definedPatterns]: VibratePattern } =
  definedPatterns;

export const selection = trigger(patterns.selection);
export const impactLight = trigger(patterns.lightImpact);
export const impactMedium = trigger(patterns.mediumImpact);
export const impactHeavy = trigger(patterns.heavyImpact);
export const notifySuccess = trigger(patterns.success);
export const notifyWarning = trigger(patterns.warning);
export const notifyError = trigger(patterns.error);
export const score = trigger(patterns.score);
export const danger = trigger(patterns.danger);
export const gameOver = trigger(patterns.gameOver);
export const stop = trigger(patterns.stop);

const haptics = {
  vibrate,
  supportsVibration,
  supportsGamepadVibration,
  selection,
  impactLight,
  impactMedium,
  impactHeavy,
  notifySuccess,
  notifyWarning,
  notifyError,
  score,
  danger,
  gameOver,
  stop,
  patterns,
};

export default haptics;
