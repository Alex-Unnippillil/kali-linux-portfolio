export type HapticPattern = number | number[];

const supportsVibration = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const supportsGamepadVibration = () => {
  if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return false;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return Array.from(pads).some(
    (p) => p && p.vibrationActuator && typeof p.vibrationActuator.playEffect === 'function'
  );
};

const triggerGamepad = (duration: number) => {
  if (!supportsGamepadVibration()) return;
  try {
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad && pad.vibrationActuator) {
        pad.vibrationActuator.playEffect('dual-rumble', {
          duration,
          strongMagnitude: 1.0,
          weakMagnitude: 1.0,
        });
      }
    }
  } catch {
    // ignore errors
  }
};

export const vibrate = (pattern: HapticPattern) => {
  const duration = Array.isArray(pattern)
    ? pattern.reduce((sum, n) => sum + (n > 0 ? n : 0), 0)
    : pattern;

  try {
    if (supportsVibration()) navigator.vibrate(pattern);
    triggerGamepad(duration);
  } catch {
    // ignore unsupported devices
  }
};

export const patterns = {
  score: [20],
  danger: [40, 80, 40],
  gameOver: [100, 30, 100],
};

export const score = () => vibrate(patterns.score);
export const danger = () => vibrate(patterns.danger);
export const gameOver = () => vibrate(patterns.gameOver);

const haptics = {
  vibrate,
  score,
  danger,
  gameOver,
  patterns,
};

export default haptics;
