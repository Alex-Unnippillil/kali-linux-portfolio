// Shunting-yard evaluator and tokenizer for the calculator
// Exposes pure functions without DOM dependencies

const Decimal = require('decimal.js');

const toDecimal = (value) => (value instanceof Decimal ? value : new Decimal(value));
const toNumber = (value) => (value instanceof Decimal ? value.toNumber() : Number(value));

const mathOps = {
  add: (a, b, precise) => (precise ? toDecimal(a).add(b) : toNumber(a) + toNumber(b)),
  subtract: (a, b, precise) => (precise ? toDecimal(a).sub(b) : toNumber(a) - toNumber(b)),
  multiply: (a, b, precise) => (precise ? toDecimal(a).mul(b) : toNumber(a) * toNumber(b)),
  divide: (a, b, precise) => (precise ? toDecimal(a).div(b) : toNumber(a) / toNumber(b)),
  pow: (a, b, precise) => (precise ? toDecimal(a).pow(b) : Math.pow(toNumber(a), toNumber(b))),
};

const functions = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  exp: Math.exp,
  log: (value) => Math.log10(value),
  ln: Math.log,
};

const constants = {
  pi: Math.PI,
  e: Math.E,
};

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let memory = 0;

function setPreciseMode(on) {
  preciseMode = on;
  if (preciseMode) {
    memory = toDecimal(memory);
    lastResult = toDecimal(lastResult);
  } else {
    memory = toNumber(memory);
    lastResult = toNumber(lastResult);
  }
}

function setProgrammerMode(on) {
  programmerMode = on;
}

function setBase(base) {
  currentBase = base;
}

function convertBase(val, from, to) {
  const num = parseInt(val, from);
  if (isNaN(num)) return '0';
  const sign = num < 0 ? '-' : '';
  return sign + Math.abs(num).toString(to);
}

function formatBase(value, base = currentBase) {
  return convertBase(String(value), 10, base).toUpperCase();
}

function sanitizeExpression(expression) {
  return expression.replace(/(\d*\.?\d+)%/g, '($1/100)');
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
      const num = preciseMode ? toDecimal(token.value) : Number(token.value);
      stack.push(num);
    } else if (token.type === 'id') {
      if (token.value.toLowerCase() === 'ans') {
        stack.push(lastResult);
      } else if (functions[token.value]) {
        stack.push(functions[token.value]);
      } else if (constants[token.value]) {
        stack.push(constants[token.value]);
      } else if (vars[token.value] !== undefined) {
        const v = vars[token.value];
        const num = preciseMode ? toDecimal(v) : Number(v);
        stack.push(num);
      } else {
        stack.push(0);
      }
    } else if (token.type === 'unit') {
      const a = stack.pop();
      stack.push(a);
    } else if (token.type === 'func') {
      const a = stack.pop();
      const fn = functions[token.value];
      stack.push(fn ? fn(toNumber(a)) : a);
    } else if (token.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      let res;
      switch (token.value) {
        case '+':
          res = mathOps.add(a, b, preciseMode);
          break;
        case '-':
          res = mathOps.subtract(a, b, preciseMode);
          break;
        case '*':
          res = mathOps.multiply(a, b, preciseMode);
          break;
        case '/':
          res = mathOps.divide(a, b, preciseMode);
          break;
        case '^':
          res = mathOps.pow(a, b, preciseMode);
          break;
      }
      stack.push(res);
    }
  }
  return stack.pop();
}

function evaluate(expression, vars = {}) {
  const sanitizedExpression = sanitizeExpression(expression);
  let scope = { ...vars };
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('calc-vars');
      if (raw) scope = { ...JSON.parse(raw), ...scope };
    } catch {
      // ignore
    }
  }
  if (programmerMode) {
    const decimalExpr = sanitizedExpression.replace(/\b[0-9A-F]+\b/gi, (m) =>
      parseInt(m, currentBase)
    );
    const tokens = tokenize(decimalExpr);
    const rpn = toRPN(tokens);
    const result = evalRPN(rpn, scope);
    lastResult = result;
    return formatBase(result.toString());
  }
  const tokens = tokenize(sanitizedExpression);
  const rpn = toRPN(tokens);
  const result = evalRPN(rpn, scope);
  lastResult = result;
  return result.toString();
}

function memoryAdd(expr) {
  const val = evaluate(expr);
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? toDecimal(val)
      : parseFloat(val);
  memory = preciseMode ? mathOps.add(memory, num, true) : memory + num;
  return memory;
}

function memorySubtract(expr) {
  const val = evaluate(expr);
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? toDecimal(val)
      : parseFloat(val);
  memory = preciseMode ? mathOps.subtract(memory, num, true) : memory - num;
  return memory;
}

function memoryRecall() {
  return preciseMode ? memory.toString() : memory;
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
