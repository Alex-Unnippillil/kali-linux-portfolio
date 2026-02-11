import usePersistentState from '../../hooks/usePersistentState';

export interface Formula {
  name: string;
  expr: string;
}

export const FORMULAS_KEY = 'calc-formulas';

export function useFormulas() {
  return usePersistentState<Formula[]>(
    FORMULAS_KEY,
    () => [],
    (v): v is Formula[] => Array.isArray(v) && v.every((f) => typeof f.name === 'string' && typeof f.expr === 'string'),
  );
}
