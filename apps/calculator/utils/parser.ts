import { create, all } from 'mathjs';

const math = create(all);

export interface EvalOptions {
  /** Base for numeric literals and result formatting */
  base?: number;
}

function convertBase(val: string, from: number, to: number) {
  const num = parseInt(val, from);
  if (Number.isNaN(num)) return '0';
  return num.toString(to);
}

function preprocess(expr: string, base: number) {
  // insert space before units so mathjs can parse them
  let normalized = expr.replace(/([0-9A-F.]+)([A-Za-z]+)/g, '$1 $2');
  // when using a base other than 10, convert all integer literals
  if (base !== 10) {
    normalized = normalized.replace(/\b[0-9A-F]+\b/gi, (m) => parseInt(m, base).toString());
  }
  return normalized;
}

export function evaluate(expression: string, opts: EvalOptions = {}) {
  const base = opts.base ?? 10;
  const prepared = preprocess(expression, base);
  let scope: Record<string, any> = {};
  try {
    const raw = typeof window === 'undefined' ? null : localStorage.getItem('calc-vars');
    scope = raw ? JSON.parse(raw) : {};
    Object.keys(scope).forEach((k) => {
      const v = scope[k];
      const num = Number(v);
      scope[k] = Number.isNaN(num) ? v : num;
    });
  } catch {
    scope = {};
  }
  const result = math.evaluate(prepared, scope);
  if (math.isUnit(result)) {
    return result.toString();
  }
  // stringify numbers or BigNumbers
  const value = math.isBigNumber(result) ? result.toString() : String(result);
  if (base !== 10) {
    return convertBase(value, 10, base).toUpperCase();
  }
  return value;
}

export { convertBase };
