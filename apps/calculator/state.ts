import usePersistentState from '../../hooks/usePersistentState';

export const VARS_KEY = 'calc-vars';

export type VarMap = Record<string, string>;

export function useVariables() {
  return usePersistentState<VarMap>(
    VARS_KEY,
    () => ({}),
    (v): v is VarMap => typeof v === 'object' && v !== null && !Array.isArray(v),
  );
}
