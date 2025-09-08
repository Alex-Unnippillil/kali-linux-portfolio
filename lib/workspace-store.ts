const KEY = 'active-workspace';

export function getWorkspace(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(KEY);
  const idx = parseInt(raw ?? '', 10);
  return isNaN(idx) ? 0 : idx;
}

export function setWorkspace(idx: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(idx));
}
