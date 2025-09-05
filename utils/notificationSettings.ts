const DND_KEY = 'notifications-dnd';

/**
 * Returns the current Do Not Disturb flag from notification settings.
 * Defaults to false when running server-side or when no preference is stored.
 */
export function getDoNotDisturb(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DND_KEY) === 'true';
}

/**
 * Persists the Do Not Disturb flag in notification settings.
 */
export function setDoNotDisturb(value: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DND_KEY, value ? 'true' : 'false');
}
