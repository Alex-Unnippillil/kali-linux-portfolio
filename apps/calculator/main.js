// Shunting-yard evaluator and tokenizer for the calculator
// Exposes pure functions without DOM dependencies

const Decimal = require('decimal.js');

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let memory = 0;

function setPreciseMode(on) {
  preciseMode = on;
  if (preciseMode) {
    memory = new Decimal(memory);
    lastResult = new Decimal(lastResult);
  } else {
    memory = Decimal.isDecimal(memory) ? memory.toNumber() : memory;
    lastResult = Decimal.isDecimal(lastResult) ? lastResult.toNumber() : lastResult;
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
      const num = preciseMode ? new Decimal(token.value) : Number(token.value);
      stack.push(num);
    } else if (token.type === 'id') {
      if (token.value.toLowerCase() === 'ans') {
        stack.push(lastResult);
      } else if (token.value.toLowerCase() === 'pi') {
        stack.push(preciseMode ? new Decimal(Math.PI) : Math.PI);
      } else if (token.value.toLowerCase() === 'e') {
        stack.push(preciseMode ? new Decimal(Math.E) : Math.E);
      } else if (vars[token.value] !== undefined) {
        const v = vars[token.value];
        const num = preciseMode ? new Decimal(v) : Number(v);
        stack.push(num);
      } else {
        stack.push(0);
      }
    } else if (token.type === 'func') {
      const a = stack.pop();
      const fnName = token.value.toLowerCase();
      const value = Decimal.isDecimal(a) ? a.toNumber() : a;
      let resultVal;
      switch (fnName) {
        case 'sin':
          resultVal = Math.sin(value);
          break;
        case 'cos':
          resultVal = Math.cos(value);
          break;
        case 'tan':
          resultVal = Math.tan(value);
          break;
        case 'sqrt':
          resultVal = Math.sqrt(value);
          break;
        case 'abs':
          resultVal = Math.abs(value);
          break;
        case 'log':
          resultVal = Math.log10 ? Math.log10(value) : Math.log(value) / Math.LN10;
          break;
        case 'ln':
          resultVal = Math.log(value);
          break;
        case 'floor':
          resultVal = Math.floor(value);
          break;
        case 'ceil':
          resultVal = Math.ceil(value);
          break;
        case 'round':
          resultVal = Math.round(value);
          break;
        default:
          resultVal = value;
          break;
      }
      stack.push(preciseMode ? new Decimal(resultVal) : resultVal);
    } else if (token.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      let res;
      switch (token.value) {
        case '+':
          res = preciseMode ? Decimal.add(a, b) : a + b;
          break;
        case '-':
          res = preciseMode ? Decimal.sub(a, b) : a - b;
          break;
        case '*':
          res = preciseMode ? Decimal.mul(a, b) : a * b;
          break;
        case '/':
          res = preciseMode ? Decimal.div(a, b) : a / b;
          break;
        case '^':
          res = preciseMode ? Decimal.pow(a, b) : a ** b;
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
      String(parseInt(m, currentBase))
    );
    const tokens = tokenize(decimalExpr);
    const rpn = toRPN(tokens);
    const result = evalRPN(rpn, scope);
    lastResult = result;
    return formatBase(result);
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
      ? new Decimal(val)
      : parseFloat(val);
  memory = preciseMode ? Decimal.add(memory, num) : memory + num;
  return memory;
}

function memorySubtract(expr) {
  const val = evaluate(expr);
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? new Decimal(val)
      : parseFloat(val);
  memory = preciseMode ? Decimal.sub(memory, num) : memory - num;
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
