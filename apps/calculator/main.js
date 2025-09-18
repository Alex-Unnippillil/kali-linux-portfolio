// Shunting-yard evaluator and tokenizer for the calculator
// Exposes pure functions without DOM dependencies

const Decimal = require('decimal.js');
const { dispatchStatusToast } = require('../../utils/statusToast');

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let memory = new Decimal(0);

function notifyMemory(message) {
  if (typeof dispatchStatusToast === 'function' && message) {
    dispatchStatusToast(message);
  }
}

function currentMemoryString() {
  try {
    return memory.toString();
  } catch {
    return '0';
  }
}

function parseMemoryOperand(value) {
  if (programmerMode) {
    const num = parseInt(String(value), currentBase);
    if (Number.isNaN(num)) return null;
    return new Decimal(num);
  }
  try {
    return new Decimal(value);
  } catch {
    return null;
  }
}

function applyMemoryOperation(expr, operation) {
  let evaluated;
  try {
    evaluated = evaluate(expr);
  } catch {
    return currentMemoryString();
  }
  const operand = parseMemoryOperand(evaluated);
  if (!operand) return currentMemoryString();
  memory = operation === 'add' ? memory.add(operand) : memory.sub(operand);
  const stored = currentMemoryString();
  notifyMemory(`Memory updated: ${stored}`);
  return stored;
}

function setPreciseMode(on) {
  preciseMode = on;
  if (typeof math !== 'undefined') {
    math.config(
      preciseMode ? { number: 'BigNumber', precision: 64 } : { number: 'number' }
    );
    if (preciseMode) {
      lastResult = math.bignumber(lastResult);
    } else {
      lastResult = math.number(lastResult);
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
  const num = parseInt(val, from);
  if (isNaN(num)) return '0';
  const sign = num < 0 ? '-' : '';
  return sign + Math.abs(num).toString(to);
}

function formatBase(value, base = currentBase) {
  return convertBase(String(value), 10, base).toUpperCase();
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
      const num = preciseMode ? math.bignumber(token.value) : Number(token.value);
      stack.push(num);
    } else if (token.type === 'id') {
      if (token.value.toLowerCase() === 'ans') {
        stack.push(lastResult);
      } else if (typeof math[token.value] !== 'undefined') {
        stack.push(math[token.value]);
      } else if (vars[token.value] !== undefined) {
        const v = vars[token.value];
        const num = preciseMode ? math.bignumber(v) : Number(v);
        stack.push(num);
      } else {
        stack.push(0);
      }
    } else if (token.type === 'unit') {
      const a = stack.pop();
      stack.push(math.multiply(a, math.unit(1, token.value)));
    } else if (token.type === 'func') {
      const a = stack.pop();
      const fn = math[token.value];
      stack.push(fn ? fn(a) : a);
    } else if (token.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      let res;
      switch (token.value) {
        case '+':
          res = math.add(a, b);
          break;
        case '-':
          res = math.subtract(a, b);
          break;
        case '*':
          res = math.multiply(a, b);
          break;
        case '/':
          res = math.divide(a, b);
          break;
        case '^':
          res = math.pow(a, b);
          break;
      }
      stack.push(res);
    }
  }
  return stack.pop();
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
  if (programmerMode) {
    const decimalExpr = expression.replace(/\b[0-9A-F]+\b/gi, (m) =>
      parseInt(m, currentBase)
    );
    const ctx = { Ans: lastResult };
    for (const [k, v] of Object.entries(scope)) {
      ctx[k] = preciseMode ? math.bignumber(v) : Number(v);
    }
    const result = math.evaluate(decimalExpr, ctx);
    lastResult = result;
    return formatBase(result);
  }
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  const result = evalRPN(rpn, scope);
  lastResult = result;
  return result.toString();
}

function memoryAdd(expr) {
  return applyMemoryOperation(expr, 'add');
}

function memorySubtract(expr) {
  return applyMemoryOperation(expr, 'subtract');
}

function memoryRecall() {
  return currentMemoryString();
}

function memoryClear() {
  memory = new Decimal(0);
  notifyMemory('Memory cleared');
  return currentMemoryString();
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
  memoryClear,
  getLastResult,
};
