import { supportsVibration } from '../components/apps/Games/common/haptics';

export type HapticPattern = number | number[];

export function vibrateIfEnabled(enabled: boolean, pattern: HapticPattern): boolean {
  if (!enabled) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  if (!supportsVibration()) return false;
  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}
