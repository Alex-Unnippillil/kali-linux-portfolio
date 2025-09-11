import usePersistentState from '../../hooks/usePersistentState';
import { evaluate } from './main';

export interface Formula {
  name: string;
  expr: string;
}

export const FORMULAS_KEY = 'calc-formulas';

export function useFormulas() {
  return usePersistentState<Formula[]>(
    FORMULAS_KEY,
    () => [],
    (v): v is Formula[] =>
      Array.isArray(v) &&
      v.every((f) => typeof f?.name === 'string' && typeof f?.expr === 'string'),
  );
}

export function validateFormula(expr: string): boolean {
  try {
    evaluate(expr);
    return true;
  } catch {
    return false;
  }
}

