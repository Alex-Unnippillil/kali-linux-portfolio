// Shunting-yard evaluator and tokenizer for the calculator
// Exposes pure functions without DOM dependencies

const Decimal = require('decimal.js');

const DEFAULT_PRECISION = 20;
const PRECISE_PRECISION = 64;
const DEFAULT_DISPLAY_DIGITS = 16;
const PRECISE_DISPLAY_DIGITS = 64;
const FRACTION_PRECISION = 32;
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

Decimal.set({ precision: DEFAULT_PRECISION, rounding: Decimal.ROUND_HALF_UP });

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = new Decimal(0);
let memory = new Decimal(0);

function isDecimalValue(value) {
  return value instanceof Decimal;
}

function isUnitValue(value) {
  return Boolean(value && typeof value === 'object' && value.isUnit);
}

function ensureDecimal(value) {
  if (isDecimalValue(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  if (typeof value === 'bigint') {
    return new Decimal(value.toString());
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Decimal(value) : new Decimal(0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return new Decimal(0);
    }
    try {
      return new Decimal(trimmed);
    } catch {
      const match = trimmed.match(/^-?[0-9]+(?:\.[0-9]+)?/);
      return match ? new Decimal(match[0]) : new Decimal(0);
    }
  }
  if (typeof value.valueOf === 'function') {
    const primitive = value.valueOf();
    if (primitive !== value) {
      return ensureDecimal(primitive);
    }
  }
  if (typeof value.toString === 'function') {
    const str = value.toString();
    if (str && str !== '[object Object]') {
      return ensureDecimal(str);
    }
  }
  return new Decimal(0);
}

function decimalRound(value) {
  const dec = ensureDecimal(value);
  if (dec.isNegative()) {
    return dec.negated().add(0.5).floor().negated();
  }
  return dec.add(0.5).floor();
}

function toMathNumeric(value) {
  if (isDecimalValue(value)) {
    return value.toNumber();
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  if (isUnitValue(value)) {
    return value;
  }
  if (value && typeof value.valueOf === 'function') {
    const primitive = value.valueOf();
    if (primitive !== value) {
      return toMathNumeric(primitive);
    }
  }
  return Number(value);
}

function convertMathResult(value) {
  if (isUnitValue(value)) {
    return value;
  }
  if (isDecimalValue(value)) {
    return value;
  }
  if (value && value.isBigNumber) {
    return new Decimal(value.toString());
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return ensureDecimal(value);
  }
  if (typeof value === 'string') {
    return ensureDecimal(value);
  }
  if (value && typeof value.valueOf === 'function') {
    const primitive = value.valueOf();
    if (primitive !== value) {
      return convertMathResult(primitive);
    }
  }
  return ensureDecimal(value);
}

function decimalToDisplay(dec) {
  const digits = preciseMode ? PRECISE_DISPLAY_DIGITS : DEFAULT_DISPLAY_DIGITS;
  return dec.toSignificantDigits(digits).toString();
}

function valueToString(value) {
  if (isUnitValue(value)) {
    return value.toString();
  }
  if (isDecimalValue(value)) {
    return decimalToDisplay(value);
  }
  if (value === null || value === undefined) {
    return '0';
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return decimalToDisplay(ensureDecimal(value));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '0';
    }
    const dec = ensureDecimal(value);
    if (dec.isZero() && !/^[-+]?0*(?:\.0*)?$/.test(trimmed)) {
      return value;
    }
    return decimalToDisplay(dec);
  }
  if (typeof value.valueOf === 'function') {
    const primitive = value.valueOf();
    if (primitive !== value) {
      return valueToString(primitive);
    }
  }
  if (typeof value.toString === 'function') {
    const str = value.toString();
    if (str && str !== '[object Object]') {
      return valueToString(str);
    }
  }
  return decimalToDisplay(ensureDecimal(value));
}

function extractNumeric(value) {
  if (isDecimalValue(value)) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return ensureDecimal(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return new Decimal(0);
    }
    const match = trimmed.match(/^-?[0-9]+(?:\.[0-9]+)?/);
    return match ? new Decimal(match[0]) : new Decimal(0);
  }
  if (isUnitValue(value)) {
    const text = value.toString();
    const match = text.match(/^-?[0-9]+(?:\.[0-9]+)?/);
    return match ? new Decimal(match[0]) : new Decimal(0);
  }
  if (value && typeof value.valueOf === 'function') {
    const primitive = value.valueOf();
    if (primitive !== value) {
      return extractNumeric(primitive);
    }
  }
  return new Decimal(0);
}

function parseFromBase(value, base) {
  if (typeof value !== 'string') {
    value = String(value);
  }
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
}

function convertIntegerPart(integer, base) {
  let current = integer;
  if (current.isZero()) {
    return '0';
  }
  const digits = [];
  while (current.gt(0)) {
    const remainder = current.mod(base).toNumber();
    digits.push(DIGITS[remainder]);
    current = current.dividedToIntegerBy(base);
  }
  return digits.reverse().join('');
}

function incrementBaseString(str, base) {
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
}

function convertFractionPart(fraction, base, precision) {
  if (fraction.isZero()) {
    return { digits: '', carry: false };
  }
  const digits = [];
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
    if (roundDigit >= base / 2) {
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
}

const DECIMAL_FUNCTIONS = {
  abs: (x) => ensureDecimal(x).abs(),
  ceil: (x) => ensureDecimal(x).ceil(),
  floor: (x) => ensureDecimal(x).floor(),
  round: (x) => decimalRound(x),
  sqrt: (x) => ensureDecimal(x).sqrt(),
  sin: (x) => Decimal.sin(ensureDecimal(x)),
  cos: (x) => Decimal.cos(ensureDecimal(x)),
  tan: (x) => Decimal.tan(ensureDecimal(x)),
  asin: (x) => Decimal.asin(ensureDecimal(x)),
  acos: (x) => Decimal.acos(ensureDecimal(x)),
  atan: (x) => Decimal.atan(ensureDecimal(x)),
  sinh: (x) => Decimal.sinh(ensureDecimal(x)),
  cosh: (x) => Decimal.cosh(ensureDecimal(x)),
  tanh: (x) => Decimal.tanh(ensureDecimal(x)),
  exp: (x) => Decimal.exp(ensureDecimal(x)),
  ln: (x) => Decimal.ln(ensureDecimal(x)),
  log: (x) => Decimal.ln(ensureDecimal(x)),
  log10: (x) => Decimal.log10(ensureDecimal(x)),
};

function callFunction(name, value) {
  const fn = DECIMAL_FUNCTIONS[name.toLowerCase()];
  if (fn) {
    return fn(value);
  }
  if (typeof math !== 'undefined' && typeof math[name] === 'function') {
    const arg = isUnitValue(value) ? value : toMathNumeric(value);
    const result = math[name](arg);
    return convertMathResult(result);
  }
  return value;
}

function applyOperator(operator, left, right) {
  if (isUnitValue(left) || isUnitValue(right)) {
    if (typeof math === 'undefined') {
      throw new Error('Unit operations require math.js');
    }
    const a = isUnitValue(left) ? left : toMathNumeric(left);
    const b = isUnitValue(right) ? right : toMathNumeric(right);
    switch (operator) {
      case '+':
        return math.add(a, b);
      case '-':
        return math.subtract(a, b);
      case '*':
        return math.multiply(a, b);
      case '/':
        return math.divide(a, b);
      case '^':
        return math.pow(a, b);
      default:
        return math.add(a, b);
    }
  }
  const a = ensureDecimal(left);
  const b = ensureDecimal(right);
  switch (operator) {
    case '+':
      return a.add(b);
    case '-':
      return a.sub(b);
    case '*':
      return a.mul(b);
    case '/':
      return a.div(b);
    case '^':
      return a.pow(b);
    default:
      return ensureDecimal(0);
  }
}

function setPreciseMode(on) {
  preciseMode = !!on;
  Decimal.set({
    precision: preciseMode ? PRECISE_PRECISION : DEFAULT_PRECISION,
    rounding: Decimal.ROUND_HALF_UP,
  });
  memory = ensureDecimal(memory);
  if (!isUnitValue(lastResult)) {
    lastResult = ensureDecimal(lastResult);
  }
  if (typeof math !== 'undefined' && typeof math.config === 'function') {
    try {
      math.config({ number: 'number' });
    } catch (err) {
      if (!err || !err.message || !/read-only/i.test(err.message)) {
        throw err;
      }
    }
  }
}

function setProgrammerMode(on) {
  programmerMode = on;
}

function setBase(base) {
  currentBase = base;
}

function convertBase(val, from, to) {
  if (
    typeof from !== 'number' ||
    typeof to !== 'number' ||
    Number.isNaN(from) ||
    Number.isNaN(to) ||
    from < 2 ||
    from > 36 ||
    to < 2 ||
    to > 36
  ) {
    return '0';
  }

  const precision = preciseMode ? PRECISE_PRECISION : FRACTION_PRECISION;
  let decimalValue;

  if (from === 10) {
    try {
      decimalValue = ensureDecimal(val);
    } catch {
      return '0';
    }
  } else {
    const parsed = parseFromBase(val, from);
    if (parsed === null) {
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
  let integerPart = absValue.trunc();
  const fractionPart = absValue.sub(integerPart);
  let intStr = convertIntegerPart(integerPart, to);
  const { digits: fracStr, carry } = convertFractionPart(fractionPart, to, precision);
  if (carry) {
    intStr = incrementBaseString(intStr, to);
  }
  const result = fracStr ? `${intStr}.${fracStr}` : intStr;
  return negative ? `-${result}` : result;
}

function formatBase(value, base = currentBase) {
  if (isUnitValue(value)) {
    return value.toString();
  }
  if (base === 10) {
    return valueToString(value);
  }
  return convertBase(value, 10, base).toUpperCase();
}

// --- Tokenizer ---
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (
      ch === '-' &&
      (tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'operator' ||
        tokens[tokens.length - 1].value === '(')
    ) {
      const next = expr[i + 1];
      if (/\d|\./.test(next)) {
        let num = '-';
        const start = i;
        i++;
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: num, start });
        let unit = '';
        while (i < expr.length && /[A-Za-z]/.test(expr[i])) {
          unit += expr[i];
          i++;
        }
        if (unit) tokens.push({ type: 'unit', value: unit, start: i - unit.length });
        continue;
      }
      tokens.push({ type: 'number', value: '0', start: i });
      tokens.push({ type: 'operator', value: '-', start: i });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      const start = i;
      i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num, start });
      let unit = '';
      while (i < expr.length && /[A-Za-z]/.test(expr[i])) {
        unit += expr[i];
        i++;
      }
      if (unit) tokens.push({ type: 'unit', value: unit, start: i - unit.length });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const start = i;
      const id = expr.slice(i).match(/^[A-Za-z]+/)[0];
      i += id.length;
      if (expr[i] === '(') {
        tokens.push({ type: 'func', value: id, start });
      } else {
        tokens.push({ type: 'id', value: id, start });
      }
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({
        type: ch === '(' || ch === ')' ? 'paren' : ch === ',' ? 'comma' : 'operator',
        value: ch,
        start: i,
      });
      i++;
      continue;
    }
    const err = new Error(`Unexpected '${ch}'`);
    err.index = i;
    throw err;
  }
  return tokens;
}

// --- Shunting-yard evaluator ---
function toRPN(tokens) {
  const output = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc = { '^': true };
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'id' || token.type === 'unit') {
      output.push(token);
    } else if (token.type === 'func') {
      ops.push(token);
    } else if (token.type === 'operator') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (
          (top.type === 'operator' &&
            (rightAssoc[token.value]
              ? prec[token.value] < prec[top.value]
              : prec[token.value] <= prec[top.value])) ||
          top.type === 'func'
        ) {
          output.push(ops.pop());
        } else {
          break;
        }
      }
      ops.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      ops.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop());
      }
      if (!ops.length) {
        const err = new Error('Mismatched parenthesis');
        err.index = token.start;
        throw err;
      }
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === 'func') {
        output.push(ops.pop());
      }
    }
  }
  while (ops.length) {
    const op = ops.pop();
    if (op.type === 'paren') {
      const err = new Error('Mismatched parenthesis');
      err.index = op.start;
      throw err;
    }
    output.push(op);
  }
  return output;
}

function evalRPN(rpn, vars = {}) {
  const stack = [];
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(ensureDecimal(token.value));
    } else if (token.type === 'id') {
      const key = token.value;
      if (key.toLowerCase() === 'ans') {
        stack.push(lastResult);
      } else if (Object.prototype.hasOwnProperty.call(vars, key)) {
        stack.push(ensureDecimal(vars[key]));
      } else if (typeof math !== 'undefined' && typeof math[key] !== 'undefined') {
        const value = math[key];
        if (typeof value === 'function') {
          stack.push(value);
        } else {
          stack.push(convertMathResult(value));
        }
      } else {
        stack.push(ensureDecimal(0));
      }
    } else if (token.type === 'unit') {
      if (typeof math === 'undefined') {
        throw new Error('Unit support requires math.js');
      }
      const operand = stack.pop();
      const multiplier = isUnitValue(operand) ? operand : toMathNumeric(operand);
      stack.push(math.multiply(multiplier, math.unit(1, token.value)));
    } else if (token.type === 'func') {
      const operand = stack.pop();
      stack.push(callFunction(token.value, operand));
    } else if (token.type === 'operator') {
      const right = stack.pop();
      const left = stack.pop();
      stack.push(applyOperator(token.value, left, right));
    }
  }
  const result = stack.pop();
  return convertMathResult(result);
}

function evaluate(expression, vars = {}) {
  let scope = { ...vars };
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('calc-vars');
      if (raw) scope = { ...JSON.parse(raw), ...scope };
    } catch {
      // ignore
    }
  }

  const resolvedScope = {};
  for (const [key, value] of Object.entries(scope)) {
    if (typeof value === 'function' || isUnitValue(value)) {
      resolvedScope[key] = value;
    } else {
      resolvedScope[key] = ensureDecimal(value);
    }
  }

  if (programmerMode) {
    if (typeof math === 'undefined') {
      throw new Error('Programmer mode requires math.js');
    }
    const digits = DIGITS.slice(0, currentBase).toUpperCase();
    const numberPattern = new RegExp(
      `(?<![A-Za-z0-9_])(-?[${digits}]+(?:\\.[${digits}]+)?)(?![A-Za-z0-9_])`,
      'gi'
    );
    const decimalExpr = expression.replace(numberPattern, (match) =>
      convertBase(match, currentBase, 10)
    );
    const ctx = { Ans: toMathNumeric(lastResult) };
    for (const [key, value] of Object.entries(resolvedScope)) {
      ctx[key] = toMathNumeric(value);
    }
    const evaluated = math.evaluate(decimalExpr, ctx);
    const normalized = convertMathResult(evaluated);
    lastResult = normalized;
    return formatBase(normalized);
  }
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  const result = evalRPN(rpn, resolvedScope);
  const normalized = convertMathResult(result);
  lastResult = normalized;
  return valueToString(normalized);
}

function memoryAdd(expr) {
  evaluate(expr);
  const numeric = extractNumeric(lastResult);
  memory = memory.add(numeric);
  return memory;
}

function memorySubtract(expr) {
  evaluate(expr);
  const numeric = extractNumeric(lastResult);
  memory = memory.sub(numeric);
  return memory;
}

function memoryRecall() {
  return memory;
}

function getLastResult() {
  return lastResult;
}

module.exports = {
  tokenize,
  toRPN,
  evalRPN,
  evaluate,
  setPreciseMode,
  setProgrammerMode,
  setBase,
  convertBase,
  formatBase,
  memoryAdd,
  memorySubtract,
  memoryRecall,
  getLastResult,
};
