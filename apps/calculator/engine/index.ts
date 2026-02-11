import Decimal from 'decimal.js';

export type CalcMode = 'basic' | 'scientific' | 'programmer';
export type AngleUnit = 'deg' | 'rad';
export type Base = 2 | 8 | 10 | 16;

type TokenType = 'number' | 'identifier' | 'operator' | 'paren' | 'comma';

interface Token {
  type: TokenType;
  value: string;
  index: number;
}

interface OperatorDef {
  precedence: number;
  associativity: 'left' | 'right';
  arity: 1 | 2;
  postfix?: boolean;
}

export interface EngineConfig {
  mode: CalcMode;
  base?: Base;
  angleUnit?: AngleUnit;
  preciseMode?: boolean;
  bitWidth?: number;
  ans?: string;
  variables?: Record<string, string | number>;
}

export interface CalcErrorShape {
  kind: 'token' | 'syntax' | 'domain' | 'math' | 'programmer';
  message: string;
  index: number;
}

export class CalcError extends Error implements CalcErrorShape {
  kind: CalcErrorShape['kind'];
  index: number;

  constructor(kind: CalcErrorShape['kind'], message: string, index = 0) {
    super(message);
    this.kind = kind;
    this.index = index;
  }
}

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'ln', 'log10', 'exp', 'pow', 'floor', 'ceil', 'round', 'mod', 'log',
]);

const SCI_OPERATORS: Record<string, OperatorDef> = {
  '+': { precedence: 1, associativity: 'left', arity: 2 },
  '-': { precedence: 1, associativity: 'left', arity: 2 },
  '*': { precedence: 2, associativity: 'left', arity: 2 },
  '/': { precedence: 2, associativity: 'left', arity: 2 },
  '^': { precedence: 4, associativity: 'right', arity: 2 },
  'u+': { precedence: 3, associativity: 'right', arity: 1 },
  'u-': { precedence: 3, associativity: 'right', arity: 1 },
  '!': { precedence: 5, associativity: 'left', arity: 1, postfix: true },
  '%': { precedence: 5, associativity: 'left', arity: 1, postfix: true },
};

const PROG_OPERATORS: Record<string, OperatorDef> = {
  '|': { precedence: 1, associativity: 'left', arity: 2 },
  '^': { precedence: 2, associativity: 'left', arity: 2 },
  '&': { precedence: 3, associativity: 'left', arity: 2 },
  '<<': { precedence: 4, associativity: 'left', arity: 2 },
  '>>': { precedence: 4, associativity: 'left', arity: 2 },
  '+': { precedence: 5, associativity: 'left', arity: 2 },
  '-': { precedence: 5, associativity: 'left', arity: 2 },
  '*': { precedence: 6, associativity: 'left', arity: 2 },
  '/': { precedence: 6, associativity: 'left', arity: 2 },
  '%': { precedence: 6, associativity: 'left', arity: 2 },
  '~': { precedence: 7, associativity: 'right', arity: 1 },
  'u+': { precedence: 7, associativity: 'right', arity: 1 },
  'u-': { precedence: 7, associativity: 'right', arity: 1 },
};

function isOperator(value: string, mode: CalcMode) {
  return Boolean((mode === 'programmer' ? PROG_OPERATORS : SCI_OPERATORS)[value]);
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
    const pair = expression.slice(i, i + 2);
    if (pair === '<<' || pair === '>>') {
      tokens.push({ type: 'operator', value: pair, index: i });
      i += 2;
      continue;
    }
    if (/\d|\./.test(ch)) {
      const start = i;
      i += 1;
      while (i < expression.length && /[\dA-Fa-f._]/.test(expression[i])) i += 1;
      tokens.push({ type: 'number', value: expression.slice(start, i).replace(/_/g, ''), index: start });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < expression.length && /[A-Za-z0-9_]/.test(expression[i])) i += 1;
      tokens.push({ type: 'identifier', value: expression.slice(start, i), index: start });
      continue;
    }
    if ('()+-*/^%,!~|&,'.includes(ch)) {
      tokens.push({ type: ch === '(' || ch === ')' ? 'paren' : ch === ',' ? 'comma' : 'operator', value: ch, index: i });
      i += 1;
      continue;
    }
    throw new CalcError('token', `Invalid token "${ch}"`, i);
  }
  return tokens;
}

export function parseToRpn(tokens: Token[], mode: CalcMode): Token[] {
  const output: Token[] = [];
  const ops: Token[] = [];
  const fnArgStack: number[] = [];

  const getOpDef = (op: string) => (mode === 'programmer' ? PROG_OPERATORS[op] : SCI_OPERATORS[op]);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const prev = tokens[i - 1];

    if (token.type === 'number') {
      output.push(token);
      continue;
    }

    if (token.type === 'identifier') {
      const next = tokens[i + 1];
      if (mode === 'programmer' && /^[A-F]+$/i.test(token.value)) {
        output.push({ ...token, type: 'number', value: token.value.toUpperCase() });
      } else if (next?.type === 'paren' && next.value === '(' && FUNCTIONS.has(token.value.toLowerCase())) {
        ops.push({ ...token, type: 'identifier' });
        fnArgStack.push(1);
      } else {
        output.push(token);
      }
      continue;
    }

    if (token.type === 'comma') {
      while (ops.length && !(ops[ops.length - 1].type === 'paren' && ops[ops.length - 1].value === '(')) {
        output.push(ops.pop()!);
      }
      if (!ops.length) throw new CalcError('syntax', 'Unexpected comma', token.index);
      fnArgStack[fnArgStack.length - 1] += 1;
      continue;
    }

    if (token.type === 'operator') {
      let op = token.value;
      const unaryContext = !prev || (prev.type === 'operator' && prev.value !== '!') || (prev.type === 'paren' && prev.value === '(') || prev.type === 'comma';
      if ((op === '+' || op === '-') && unaryContext) op = `u${op}`;
      if (op === '~' && !unaryContext) throw new CalcError('syntax', 'Unexpected bitwise NOT', token.index);
      if (!isOperator(op, mode)) throw new CalcError('syntax', `Operator ${op} unavailable in ${mode} mode`, token.index);

      const current = getOpDef(op)!;
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== 'operator') break;
        const topDef = getOpDef(top.value);
        if (!topDef) break;
        const shouldPop = current.associativity === 'left' ? current.precedence <= topDef.precedence : current.precedence < topDef.precedence;
        if (!shouldPop) break;
        output.push(ops.pop()!);
      }
      ops.push({ ...token, value: op });
      continue;
    }

    if (token.type === 'paren' && token.value === '(') {
      ops.push(token);
      continue;
    }

    if (token.type === 'paren' && token.value === ')') {
      while (ops.length && !(ops[ops.length - 1].type === 'paren' && ops[ops.length - 1].value === '(')) output.push(ops.pop()!);
      if (!ops.length) throw new CalcError('syntax', 'Mismatched parentheses', token.index);
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === 'identifier' && FUNCTIONS.has(ops[ops.length - 1].value.toLowerCase())) {
        const fn = ops.pop()!;
        output.push({ ...fn, value: `${fn.value}|${fnArgStack.pop() ?? 1}` });
      }
    }
  }

  while (ops.length) {
    const top = ops.pop()!;
    if (top.type === 'paren') throw new CalcError('syntax', 'Mismatched parentheses', top.index);
    output.push(top);
  }
  return output;
}

function factorial(value: number, index: number): number {
  if (!Number.isInteger(value) || value < 0) throw new CalcError('domain', 'Factorial requires a non-negative integer', index);
  let result = 1;
  for (let i = 2; i <= value; i += 1) result *= i;
  return result;
}

function toRadians(value: number, angleUnit: AngleUnit) {
  return angleUnit === 'deg' ? (value * Math.PI) / 180 : value;
}
function fromRadians(value: number, angleUnit: AngleUnit) {
  return angleUnit === 'deg' ? (value * 180) / Math.PI : value;
}

function parseBigIntLiteral(value: string, base: Base, index: number): bigint {
  if (value.includes('.')) throw new CalcError('programmer', 'Programmer mode supports integers only', index);
  const normalized = value.toUpperCase();
  const digits = '0123456789ABCDEF';
  let total = 0n;
  for (const char of normalized) {
    const digit = digits.indexOf(char);
    if (digit < 0 || digit >= base) throw new CalcError('programmer', `Digit ${char} invalid for base ${base}`, index);
    total = total * BigInt(base) + BigInt(digit);
  }
  return total;
}

function evaluateScientific(rpn: Token[], config: EngineConfig): string {
  const stack: Array<number | Decimal> = [];
  const precise = Boolean(config.preciseMode);
  const angle = config.angleUnit ?? 'rad';
  const variables = config.variables ?? {};

  const asNumber = (v: number | Decimal) => (Decimal.isDecimal(v) ? v.toNumber() : v);

  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(precise ? new Decimal(token.value) : Number(token.value));
      continue;
    }
    if (token.type === 'identifier') {
      const [name, arityString] = token.value.split('|');
      if (arityString) {
        const arity = Number(arityString);
        const args = Array.from({ length: arity }, () => asNumber(stack.pop() as number | Decimal)).reverse();
        const fn = name.toLowerCase();
        let result: number;
        switch (fn) {
          case 'sin': result = Math.sin(toRadians(args[0], angle)); break;
          case 'cos': result = Math.cos(toRadians(args[0], angle)); break;
          case 'tan': result = Math.tan(toRadians(args[0], angle)); break;
          case 'asin': result = fromRadians(Math.asin(args[0]), angle); break;
          case 'acos': result = fromRadians(Math.acos(args[0]), angle); break;
          case 'atan': result = fromRadians(Math.atan(args[0]), angle); break;
          case 'sqrt': if (args[0] < 0) throw new CalcError('domain', 'sqrt domain error', token.index); result = Math.sqrt(args[0]); break;
          case 'cbrt': result = Math.cbrt(args[0]); break;
          case 'abs': result = Math.abs(args[0]); break;
          case 'ln': if (args[0] <= 0) throw new CalcError('domain', 'ln domain error', token.index); result = Math.log(args[0]); break;
          case 'log10': if (args[0] <= 0) throw new CalcError('domain', 'log10 domain error', token.index); result = Math.log10(args[0]); break;
          case 'exp': result = Math.exp(args[0]); break;
          case 'pow': result = Math.pow(args[0], args[1]); break;
          case 'floor': result = Math.floor(args[0]); break;
          case 'ceil': result = Math.ceil(args[0]); break;
          case 'round': result = Math.round(args[0]); break;
          case 'mod': result = args[0] % args[1]; break;
          case 'log': if (args[0] <= 0) throw new CalcError('domain', 'log domain error', token.index); result = Math.log10(args[0]); break;
          default: throw new CalcError('syntax', `Unknown function ${fn}`, token.index);
        }
        stack.push(precise ? new Decimal(result) : result);
        continue;
      }
      const lower = token.value.toLowerCase();
      if (lower === 'pi') stack.push(precise ? new Decimal(Math.PI) : Math.PI);
      else if (lower === 'e') stack.push(precise ? new Decimal(Math.E) : Math.E);
      else if (lower === 'ans') stack.push(Number(config.ans ?? 0));
      else stack.push(Number(variables[token.value] ?? 0));
      continue;
    }
    if (token.type === 'operator') {
      const op = token.value;
      if (op === 'u-' || op === 'u+') {
        const val = stack.pop() as number | Decimal;
        stack.push(op === 'u-' ? (Decimal.isDecimal(val) ? val.mul(-1) : -val) : val);
        continue;
      }
      if (op === '!') {
        stack.push(factorial(asNumber(stack.pop() as number | Decimal), token.index));
        continue;
      }
      if (op === '%') {
        const val = stack.pop() as number | Decimal;
        stack.push(Decimal.isDecimal(val) ? val.div(100) : val / 100);
        continue;
      }
      const right = stack.pop() as number | Decimal | undefined;
      const left = stack.pop() as number | Decimal | undefined;
      if (right === undefined || left === undefined) throw new CalcError('syntax', 'Missing operand', token.index);
      if (op === '/' && asNumber(right) === 0) throw new CalcError('math', 'Division by zero', token.index);
      if (precise && ['+', '-', '*', '/', '^'].includes(op)) {
        const a = Decimal.isDecimal(left) ? left : new Decimal(left);
        const b = Decimal.isDecimal(right) ? right : new Decimal(right);
        switch (op) {
          case '+': stack.push(a.plus(b)); break;
          case '-': stack.push(a.minus(b)); break;
          case '*': stack.push(a.times(b)); break;
          case '/': stack.push(a.div(b)); break;
          case '^': stack.push(a.pow(b.toNumber())); break;
        }
      } else {
        const a = asNumber(left);
        const b = asNumber(right);
        const map: Record<string, number> = { '+': a + b, '-': a - b, '*': a * b, '/': a / b, '^': a ** b };
        stack.push(map[op]);
      }
    }
  }
  if (stack.length !== 1) throw new CalcError('syntax', 'Malformed expression', 0);
  const result = stack.pop();
  return Decimal.isDecimal(result) ? result.toString() : String(result ?? 0);
}

function evaluateProgrammer(rpn: Token[], config: EngineConfig): string {
  const stack: bigint[] = [];
  const base = config.base ?? 10;
  const bitWidth = config.bitWidth ?? 64;
  const mask = (1n << BigInt(bitWidth)) - 1n;

  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(parseBigIntLiteral(token.value, base, token.index));
      continue;
    }
    if (token.type === 'identifier') {
      const lower = token.value.toLowerCase();
      if (lower === 'ans') stack.push(BigInt(config.ans ?? 0));
      else throw new CalcError('programmer', `Unknown identifier ${token.value}`, token.index);
      continue;
    }
    if (token.type === 'operator') {
      const op = token.value;
      if (op === '~') {
        stack.push((~stack.pop()!) & mask);
        continue;
      }
      if (op === 'u-' || op === 'u+') {
        const value = stack.pop()!;
        stack.push(op === 'u-' ? -value : value);
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new CalcError('syntax', 'Missing operand', token.index);
      if ((op === '<<' || op === '>>') && (b < 0n || b > 256n)) throw new CalcError('programmer', 'Invalid shift amount', token.index);
      if ((op === '/' || op === '%') && b === 0n) throw new CalcError('math', 'Division by zero', token.index);
      const map: Record<string, bigint> = {
        '+': a + b,
        '-': a - b,
        '*': a * b,
        '/': a / b,
        '%': a % b,
        '&': a & b,
        '|': a | b,
        '^': a ^ b,
        '<<': a << b,
        '>>': a >> b,
      };
      stack.push(map[op]);
    }
  }

  if (stack.length !== 1) throw new CalcError('syntax', 'Malformed expression', 0);
  return formatResult(stack.pop() ?? 0n, { mode: 'programmer', base, bitWidth });
}

export function evaluate(expression: string, config: EngineConfig): string {
  if (!expression.trim()) return '0';
  const tokens = tokenize(expression);
  const rpn = parseToRpn(tokens, config.mode);
  return config.mode === 'programmer' ? evaluateProgrammer(rpn, config) : evaluateScientific(rpn, config);
}

export function formatResult(value: bigint | number | string, config: Pick<EngineConfig, 'mode' | 'base' | 'bitWidth'>): string {
  if (config.mode !== 'programmer') return String(value);
  const base = config.base ?? 10;
  const intVal = typeof value === 'bigint' ? value : BigInt(value);
  const sign = intVal < 0n ? '-' : '';
  const abs = intVal < 0n ? -intVal : intVal;
  return `${sign}${abs.toString(base).toUpperCase()}`;
}

export function safeEvaluate(expression: string, config: EngineConfig): { ok: true; value: string } | { ok: false; error: CalcErrorShape } {
  try {
    return { ok: true, value: evaluate(expression, config) };
  } catch (error) {
    if (error instanceof CalcError) {
      return { ok: false, error: { kind: error.kind, message: error.message, index: error.index } };
    }
    return { ok: false, error: { kind: 'math', message: 'Calculation error', index: 0 } };
  }
}

export function baseBreakdown(value: string) {
  try {
    const num = BigInt(value);
    return {
      bin: num.toString(2),
      oct: num.toString(8),
      dec: num.toString(10),
      hex: num.toString(16).toUpperCase(),
    };
  } catch {
    return null;
  }
}
