import { create, all } from 'mathjs';
import Decimal from '../../../utils/decimal';

const math = create(all);

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FRACTION_PRECISION = 32;

const toDecimal = (value: Decimal.Value): Decimal => {
  if (Decimal.isDecimal(value)) {
    return value as Decimal;
  }
  try {
    return new Decimal(value);
  } catch {
    const str = String(value).trim();
    if (!str) {
      return new Decimal(0);
    }
    const match = str.match(/^-?[0-9]+(?:\.[0-9]+)?/);
    return match ? new Decimal(match[0]) : new Decimal(0);
  }
};

const parseFromBase = (value: string, base: number): Decimal | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Decimal(0);
  }
  let negative = false;
  let body = trimmed;
  if (body.startsWith('-')) {
    negative = true;
    body = body.slice(1);
  }
  if (!body) {
    return new Decimal(0);
  }
  const [intRaw, fracRaw = ''] = body.split('.');
  let dec = new Decimal(0);
  for (const ch of intRaw.toUpperCase()) {
    if (!ch) continue;
    const digit = DIGITS.indexOf(ch);
    if (digit < 0 || digit >= base) {
      return null;
    }
    dec = dec.mul(base).add(digit);
  }
  if (fracRaw) {
    let place = new Decimal(1);
    for (const ch of fracRaw.toUpperCase()) {
      const digit = DIGITS.indexOf(ch);
      if (digit < 0 || digit >= base) {
        return null;
      }
      place = place.div(base);
      dec = dec.add(new Decimal(digit).mul(place));
    }
  }
  return negative ? dec.neg() : dec;
};

const convertIntegerPart = (integer: Decimal, base: number): string => {
  let current = integer;
  if (current.isZero()) {
    return '0';
  }
  const digits: string[] = [];
  while (current.gt(0)) {
    const remainder = current.mod(base).toNumber();
    digits.push(DIGITS[remainder]);
    current = current.dividedToIntegerBy(base);
  }
  return digits.reverse().join('');
};

const incrementBaseString = (str: string, base: number): string => {
  const digits = str.split('').map((ch) => DIGITS.indexOf(ch));
  let idx = digits.length - 1;
  while (idx >= 0) {
    const next = digits[idx] + 1;
    if (next >= base) {
      digits[idx] = 0;
      idx -= 1;
    } else {
      digits[idx] = next;
      return digits.map((d) => DIGITS[d]).join('');
    }
  }
  digits.unshift(1);
  return digits.map((d) => DIGITS[d]).join('');
};

const convertFractionPart = (
  fraction: Decimal,
  base: number,
  precision: number
): { digits: string; carry: boolean } => {
  if (fraction.isZero()) {
    return { digits: '', carry: false };
  }
  const digits: number[] = [];
  let current = fraction;
  for (let i = 0; i < precision + 1; i++) {
    current = current.mul(base);
    const digit = current.trunc();
    digits.push(digit.toNumber());
    current = current.sub(digit);
    if (current.isZero()) {
      break;
    }
  }
  let carry = false;
  if (digits.length > precision) {
    const roundDigit = digits.pop();
    if (roundDigit !== undefined && roundDigit >= base / 2) {
      let idx = digits.length - 1;
      carry = true;
      while (idx >= 0) {
        const next = digits[idx] + 1;
        if (next >= base) {
          digits[idx] = 0;
          idx -= 1;
        } else {
          digits[idx] = next;
          carry = false;
          break;
        }
      }
    }
  }
  while (digits.length && digits[digits.length - 1] === 0) {
    digits.pop();
  }
  return { digits: digits.map((d) => DIGITS[d]).join(''), carry };
};

function convertBase(val: Decimal.Value, from: number, to: number, precision = FRACTION_PRECISION) {
  if (
    Number.isNaN(from) ||
    Number.isNaN(to) ||
    from < 2 ||
    from > 36 ||
    to < 2 ||
    to > 36
  ) {
    return '0';
  }

  let decimalValue: Decimal;

  if (from === 10) {
    try {
      decimalValue = toDecimal(val);
    } catch {
      return '0';
    }
  } else {
    const parsed = parseFromBase(String(val), from);
    if (!parsed) {
      return '0';
    }
    decimalValue = parsed;
  }

  if (to === 10) {
    return decimalValue.toString();
  }

  if (decimalValue.isZero()) {
    return '0';
  }

  const negative = decimalValue.isNegative();
  const absValue = decimalValue.abs();
  const integerPart = absValue.trunc();
  const fractionPart = absValue.sub(integerPart);
  let intStr = convertIntegerPart(integerPart, to);
  const { digits, carry } = convertFractionPart(fractionPart, to, precision);
  if (carry) {
    intStr = incrementBaseString(intStr, to);
  }
  const result = digits ? `${intStr}.${digits}` : intStr;
  return negative ? `-${result}` : result;
}

export interface EvalOptions {
  /** Base for numeric literals and result formatting */
  base?: number;
}

function preprocess(expr: string, base: number) {
  // insert space before units so mathjs can parse them
  let normalized = expr.replace(/([0-9A-F.]+)([A-Za-z]+)/g, '$1 $2');
  // when using a base other than 10, convert all integer literals
  if (base !== 10) {
    const digits = DIGITS.slice(0, base);
    const pattern = new RegExp(
      `(?<![A-Za-z0-9_])(-?[${digits}]+(?:\\.[${digits}]+)?)(?![A-Za-z0-9_])`,
      'gi'
    );
    normalized = normalized.replace(pattern, (m) => convertBase(m, base, 10));
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
