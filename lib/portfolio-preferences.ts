export const ENTRY_PREFERENCE_KEY = 'kali-portfolio:entry';
export function prefersDesktop(): boolean {
  try { return window.localStorage.getItem(ENTRY_PREFERENCE_KEY) === 'desktop'; }
  catch { return false; }
}
export function rememberDesktop(remember: boolean): void {
  try {
    if (remember) window.localStorage.setItem(ENTRY_PREFERENCE_KEY, 'desktop');
    else window.localStorage.removeItem(ENTRY_PREFERENCE_KEY);
  } catch { /* Storage is optional: private browsing must remain usable. */ }
}
