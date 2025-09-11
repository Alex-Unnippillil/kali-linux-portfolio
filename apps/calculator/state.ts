import usePersistentState from '../../hooks/usePersistentState';

export const VARS_KEY = 'calc-vars';

export type VarMap = Record<string, string>;

export function useVariables() {
  return usePersistentState<VarMap>(
    VARS_KEY,
    () => ({}),
    (v): v is VarMap =>
      typeof v === 'object' && v !== null && !Array.isArray(v) &&
      Object.values(v).every((val) => typeof val === 'string'),
  );
}

export function loadVariables(): VarMap {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(VARS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as VarMap;
      }
    }
  } catch {
    // ignore
  }
  return {};
}
