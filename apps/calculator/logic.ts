import Decimal from 'decimal.js';

export type Mode = 'basic' | 'scientific' | 'programmer';

interface TokenBase {
  start: number;
}

interface NumberToken extends TokenBase {
  type: 'number';
  raw: string;
}

interface IdentifierToken extends TokenBase {
  type: 'identifier';
  name: string;
}

interface FunctionToken extends TokenBase {
  type: 'function';
  name: string;
  argCount?: number;
}

interface OperatorToken extends TokenBase {
  type: 'operator';
  symbol: string;
}

interface ParenToken extends TokenBase {
  type: 'paren';
  value: '(' | ')';
}

interface CommaToken extends TokenBase {
  type: 'comma';
}

export type Token =
  | NumberToken
  | IdentifierToken
  | FunctionToken
  | OperatorToken
  | ParenToken
  | CommaToken;

const DIGIT_PATTERN = /[0-9]/;
const LETTER_PATTERN = /[A-Za-z]/;
const HEX_PATTERN = /[0-9A-Fa-f]/;

let currentMode: Mode = 'basic';
let currentBase = 10;
let lastResult = new Decimal(0);
let memoryValue = new Decimal(0);

const OP_INFO: Record<
  string,
  {
    precedence: number;
    associativity: 'left' | 'right';
    arity: 1 | 2;
    apply: (args: Decimal[]) => Decimal;
  }
> = {
  add: {
    precedence: 5,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => a.add(b),
  },
  subtract: {
    precedence: 5,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => a.sub(b),
  },
  multiply: {
    precedence: 6,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => a.mul(b),
  },
  divide: {
    precedence: 6,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => {
      if (b.isZero()) throw Object.assign(new Error('Division by zero'), { index: -1 });
      return a.div(b);
    },
  },
  power: {
    precedence: 7,
    associativity: 'right',
    arity: 2,
    apply: ([a, b]) => a.pow(b),
  },
  mod: {
    precedence: 6,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => a.mod(b),
  },
  shiftLeft: {
    precedence: 4,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => new Decimal(a.toNumber() << b.toNumber()),
  },
  shiftRight: {
    precedence: 4,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => new Decimal(a.toNumber() >> b.toNumber()),
  },
  bitAnd: {
    precedence: 3,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => new Decimal(a.toNumber() & b.toNumber()),
  },
  bitXor: {
    precedence: 2,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => new Decimal(a.toNumber() ^ b.toNumber()),
  },
  bitOr: {
    precedence: 1,
    associativity: 'left',
    arity: 2,
    apply: ([a, b]) => new Decimal(a.toNumber() | b.toNumber()),
  },
  negate: {
    precedence: 8,
    associativity: 'right',
    arity: 1,
    apply: ([a]) => a.neg(),
  },
  unaryPlus: {
    precedence: 8,
    associativity: 'right',
    arity: 1,
    apply: ([a]) => a,
  },
  percent: {
    precedence: 8,
    associativity: 'right',
    arity: 1,
    apply: ([a]) => a.div(100),
  },
  bitNot: {
    precedence: 8,
    associativity: 'right',
    arity: 1,
    apply: ([a]) => new Decimal(~a.toNumber()),
  },
};

const FUNCTIONS: Record<
  string,
  {
    minArgs: number;
    fn: (...args: Decimal[]) => Decimal;
  }
> = {
  sin: { minArgs: 1, fn: (x) => x.sin() },
  cos: { minArgs: 1, fn: (x) => x.cos() },
  tan: { minArgs: 1, fn: (x) => x.tan() },
  sqrt: { minArgs: 1, fn: (x) => x.sqrt() },
  abs: { minArgs: 1, fn: (x) => x.abs() },
  exp: { minArgs: 1, fn: (x) => x.exp() },
  log: { minArgs: 1, fn: (x) => x.log(10) },
  ln: { minArgs: 1, fn: (x) => x.ln() },
  round: { minArgs: 1, fn: (x) => x.round() },
  floor: { minArgs: 1, fn: (x) => x.floor() },
  ceil: { minArgs: 1, fn: (x) => x.ceil() },
  mod: { minArgs: 2, fn: (a, b) => a.mod(b) },
  max: {
    minArgs: 2,
    fn: (...args) => args.reduce((acc, cur) => (acc.gt(cur) ? acc : cur)),
  },
  min: {
    minArgs: 2,
    fn: (...args) => args.reduce((acc, cur) => (acc.lt(cur) ? acc : cur)),
  },
};

const CONSTANTS: Record<string, Decimal> = {
  pi: new Decimal(Math.PI),
  e: new Decimal(Math.E),
};

function charToValue(ch: string): number {
  if (DIGIT_PATTERN.test(ch)) return ch.charCodeAt(0) - 48;
  const upper = ch.toUpperCase();
  if (upper >= 'A' && upper <= 'Z') return upper.charCodeAt(0) - 55;
  return NaN;
}

function parseNumber(raw: string, base: number): Decimal {
  if (base === 10) return new Decimal(raw);
  const negative = raw.startsWith('-');
  const trimmed = negative ? raw.slice(1) : raw;
  const [intPart, fracPart] = trimmed.split('.');
  const baseDecimal = new Decimal(base);
  let result = new Decimal(0);
  for (const ch of intPart) {
    if (!ch) continue;
    const digit = charToValue(ch);
    if (Number.isNaN(digit) || digit >= base) throw Object.assign(new Error(`Invalid digit '${ch}' for base ${base}`), { index: -1 });
    result = result.mul(baseDecimal).add(digit);
  }
  if (fracPart) {
    let factor = new Decimal(1).div(baseDecimal);
    for (const ch of fracPart) {
      const digit = charToValue(ch);
      if (Number.isNaN(digit) || digit >= base) throw Object.assign(new Error(`Invalid digit '${ch}' for base ${base}`), { index: -1 });
      result = result.add(factor.mul(digit));
      factor = factor.div(baseDecimal);
    }
  }
  return negative ? result.neg() : result;
}

function formatNumber(value: Decimal, base = currentBase): string {
  if (base === 10) return value.toString();
  if (!Number.isFinite(value.toNumber())) return value.toString();
  const baseDecimal = new Decimal(base);
  const negative = value.isNegative();
  let remaining = negative ? value.neg() : value;
  const integerPart = remaining.floor();
  let intString = '';
  let temp = integerPart;
  if (temp.isZero()) {
    intString = '0';
  } else {
    while (temp.gt(0)) {
      const digit = temp.mod(baseDecimal);
      const digitValue = digit.toNumber();
      intString = digitToChar(digitValue) + intString;
      temp = temp.sub(digit).div(baseDecimal).floor();
    }
  }
  const fractionalPart = remaining.minus(integerPart);
  let fracString = '';
  let frac = fractionalPart;
  let iterations = 0;
  while (!frac.isZero() && iterations < 12) {
    frac = frac.mul(baseDecimal);
    const digit = frac.floor();
    fracString += digitToChar(digit.toNumber());
    frac = frac.minus(digit);
    iterations += 1;
  }
  return `${negative ? '-' : ''}${intString}${fracString ? `.${fracString}` : ''}`;
}

function digitToChar(value: number): string {
  if (value < 10) return String(value);
  return String.fromCharCode(55 + value);
}

export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === ',' ) {
      tokens.push({ type: 'comma', start: i });
      i += 1;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch, start: i });
      i += 1;
      continue;
    }
    if (ch === '<' || ch === '>') {
      const nextTwo = expression.slice(i, i + 2);
      if (nextTwo === '<<' || nextTwo === '>>') {
        tokens.push({ type: 'operator', symbol: nextTwo, start: i });
        i += 2;
        continue;
      }
    }
    if ('+-*/^%~&|'.includes(ch)) {
      tokens.push({ type: 'operator', symbol: ch, start: i });
      i += 1;
      continue;
    }
    if (ch === '.' || DIGIT_PATTERN.test(ch) || (currentMode === 'programmer' && HEX_PATTERN.test(ch))) {
      const start = i;
      let num = ch;
      i += 1;
      while (i < expression.length) {
        const next = expression[i];
        if (next === '.') {
          num += next;
          i += 1;
          continue;
        }
        if (DIGIT_PATTERN.test(next) || (currentMode === 'programmer' && HEX_PATTERN.test(next))) {
          num += next;
          i += 1;
          continue;
        }
        break;
      }
      tokens.push({ type: 'number', raw: num, start });
      continue;
    }
    if (LETTER_PATTERN.test(ch)) {
      const start = i;
      let ident = ch;
      i += 1;
      while (i < expression.length && /[A-Za-z0-9_]/.test(expression[i])) {
        ident += expression[i];
        i += 1;
      }
      if (expression[i] === '(') {
        tokens.push({ type: 'function', name: ident.toLowerCase(), start });
      } else {
        tokens.push({ type: 'identifier', name: ident.toLowerCase(), start });
      }
      continue;
    }
    throw Object.assign(new Error(`Unexpected token '${ch}'`), { index: i });
  }
  return tokens;
}

function toOperatorKey(token: OperatorToken, prevToken?: Token): string {
  const symbol = token.symbol;
  const prevIsValue =
    prevToken &&
    (prevToken.type === 'number' ||
      prevToken.type === 'identifier' ||
      (prevToken.type === 'paren' && prevToken.value === ')'));
  if (symbol === '-') {
    return prevIsValue ? 'subtract' : 'negate';
  }
  if (symbol === '+') {
    return prevIsValue ? 'add' : 'unaryPlus';
  }
  if (symbol === '%') {
    if (!prevIsValue) throw Object.assign(new Error('Percent must follow a value'), { index: token.start });
    return 'percent';
  }
  if (symbol === '~') {
    return 'bitNot';
  }
  if (symbol === '^') {
    return currentMode === 'programmer' ? 'bitXor' : 'power';
  }
  switch (symbol) {
    case '*':
      return 'multiply';
    case '/':
      return 'divide';
    case '&':
      return 'bitAnd';
    case '|':
      return 'bitOr';
    case '<<':
      return 'shiftLeft';
    case '>>':
      return 'shiftRight';
    default:
      return symbol;
  }
}

export function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: (OperatorToken | FunctionToken | ParenToken)[] = [];
  const argCountStack: number[] = [];
  tokens.forEach((token, idx) => {
    if (token.type === 'number' || token.type === 'identifier') {
      output.push(token);
      if (
        output.length > 1 &&
        output[output.length - 2].type === 'identifier' &&
        token.type === 'identifier' &&
        token.name === 'ans'
      ) {
        // allow successive identifiers with no separator
      }
    } else if (token.type === 'function') {
      stack.push(token);
      argCountStack.push(0);
    } else if (token.type === 'comma') {
      while (stack.length && !(stack[stack.length - 1].type === 'paren' && stack[stack.length - 1].value === '(')) {
        output.push(stack.pop() as Token);
      }
      if (!stack.length) {
        throw Object.assign(new Error('Misplaced comma'), { index: token.start });
      }
      argCountStack[argCountStack.length - 1] += 1;
    } else if (token.type === 'operator') {
      const prev = tokens[idx - 1];
      const key = toOperatorKey(token, prev);
      const info = OP_INFO[key];
      if (!info) throw Object.assign(new Error(`Unsupported operator '${token.symbol}'`), { index: token.start });
      const opToken: OperatorToken & { key: string } = { ...token, symbol: key, key };
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== 'operator') break;
        const topInfo = OP_INFO[(top as any).key ?? (top as OperatorToken).symbol];
        if (
          topInfo &&
          ((info.associativity === 'left' && info.precedence <= topInfo.precedence) ||
            (info.associativity === 'right' && info.precedence < topInfo.precedence))
        ) {
          output.push(stack.pop() as Token);
        } else {
          break;
        }
      }
      stack.push(opToken);
    } else if (token.type === 'paren' && token.value === '(') {
      stack.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (stack.length && !(stack[stack.length - 1].type === 'paren' && (stack[stack.length - 1] as ParenToken).value === '(')) {
        output.push(stack.pop() as Token);
      }
      if (!stack.length) {
        throw Object.assign(new Error('Mismatched parenthesis'), { index: token.start });
      }
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === 'function') {
        const func = stack.pop() as FunctionToken;
        const argsUsed = argCountStack.pop() ?? 0;
        func.argCount = argsUsed + 1;
        output.push(func);
      }
    }
  });
  while (stack.length) {
    const token = stack.pop() as Token;
    if (token.type === 'paren') {
      throw Object.assign(new Error('Mismatched parenthesis'), { index: token.start });
    }
    output.push(token);
  }
  return output;
}

function resolveIdentifier(name: string, scope: Record<string, Decimal>): Decimal {
  if (name === 'ans') return lastResult;
  if (CONSTANTS[name]) return CONSTANTS[name];
  if (scope[name]) return scope[name];
  throw Object.assign(new Error(`Unknown identifier '${name}'`), { index: -1 });
}

function evaluateRPN(tokens: Token[], scope: Record<string, Decimal>): Decimal {
  const stack: Decimal[] = [];
  tokens.forEach((token) => {
    if (token.type === 'number') {
      stack.push(parseNumber(token.raw, currentMode === 'programmer' ? currentBase : 10));
    } else if (token.type === 'identifier') {
      stack.push(resolveIdentifier(token.name, scope));
    } else if (token.type === 'operator') {
      const key = (token as any).key ?? token.symbol;
      const info = OP_INFO[key];
      if (!info) throw Object.assign(new Error(`Unsupported operator '${token.symbol}'`), { index: token.start });
      if (stack.length < info.arity) throw Object.assign(new Error('Insufficient values in expression'), { index: token.start });
      const args = stack.splice(stack.length - info.arity, info.arity);
      stack.push(info.apply(args));
    } else if (token.type === 'function') {
      const details = FUNCTIONS[token.name];
      if (!details) throw Object.assign(new Error(`Unknown function '${token.name}'`), { index: token.start });
      const argTotal = token.argCount ?? details.minArgs;
      if (argTotal < details.minArgs) throw Object.assign(new Error(`Function '${token.name}' expects at least ${details.minArgs} arguments`), { index: token.start });
      if (stack.length < argTotal) throw Object.assign(new Error('Insufficient values in expression'), { index: token.start });
      const args = stack.splice(stack.length - argTotal, argTotal);
      stack.push(details.fn(...args));
    }
  });
  if (stack.length !== 1) throw Object.assign(new Error('Invalid expression'), { index: -1 });
  return stack[0];
}

export interface EvaluateOptions {
  scope?: Record<string, Decimal | number | string>;
}

function buildScope(rawScope: EvaluateOptions['scope'] = {}): Record<string, Decimal> {
  const scope: Record<string, Decimal> = {};
  Object.entries(rawScope).forEach(([key, value]) => {
    try {
      scope[key.toLowerCase()] = value instanceof Decimal ? value : new Decimal(value as any);
    } catch {
      // ignore invalid scoped value
    }
  });
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('calc-vars');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([key, value]) => {
            if (typeof value === 'string') {
              try {
                scope[key.toLowerCase()] = new Decimal(value);
              } catch {
                // ignore invalid value
              }
            }
          });
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  return scope;
}

export function evaluate(expression: string, options: EvaluateOptions = {}): string {
  const scope = buildScope(options.scope);
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  const result = evaluateRPN(rpn, scope);
  lastResult = result;
  return formatNumber(result);
}

export function memoryAdd(expr: string): string {
  const result = getRpnValue(expr);
  memoryValue = memoryValue.add(result);
  return memoryValue.toString();
}

export function memorySubtract(expr: string): string {
  const result = getRpnValue(expr);
  memoryValue = memoryValue.sub(result);
  return memoryValue.toString();
}

export function memoryRecall(): string {
  return formatNumber(memoryValue);
}

export function resetMemory() {
  memoryValue = new Decimal(0);
}

export function getLastResult(): string {
  return formatNumber(lastResult);
}

export function setBase(base: number) {
  currentBase = base;
}

export function formatBase(value: string | number | Decimal, base = currentBase): string {
  const dec = value instanceof Decimal ? value : new Decimal(value as any);
  return formatNumber(dec, base);
}

export function setProgrammerMode(on: boolean) {
  currentMode = on ? 'programmer' : 'basic';
}

export function setPreciseMode(on: boolean) {
  void on; // precision is handled by Decimal defaults
}

export function setMode(mode: Mode) {
  currentMode = mode;
}

export function getMode(): Mode {
  return currentMode;
}

export function getBase(): number {
  return currentBase;
}

export function getRpnValue(expression: string, options: EvaluateOptions = {}): Decimal {
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn, buildScope(options.scope));
}

export function resetState() {
  currentMode = 'basic';
  currentBase = 10;
  lastResult = new Decimal(0);
  memoryValue = new Decimal(0);
}
