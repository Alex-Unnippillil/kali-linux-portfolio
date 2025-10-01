import usePersistentState from '../../hooks/usePersistentState';
// main.js uses CommonJS exports, so pull in evaluate via require to avoid
// TypeScript complaining about missing named exports.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { evaluate } = require('./main');

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

