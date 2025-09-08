import usePersistentState from '../../hooks/usePersistentState';
import { evaluate } from './utils/parser';

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
    const sanitized = expr.replace(/\s+/g, '');
    if (/(?:[+\-*\/]{2,})/.test(sanitized)) return false;
    evaluate(sanitized);
    return true;
  } catch {
    return false;
  }
}

