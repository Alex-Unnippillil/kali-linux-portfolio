// Shunting-yard evaluator and tokenizer for the calculator
// Exposes pure functions without DOM dependencies

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let memory = 0;

function createParseError(message, start, length = 1) {
  const err = new Error(message);
  err.index = Math.max(0, start ?? 0);
  err.length = Math.max(1, length || 1);
  return err;
}

function attachTokenLocation(err, token) {
  if (err && typeof err === 'object') {
    if (typeof err.index !== 'number') {
      err.index = token?.start ?? 0;
    }
    if (typeof err.length !== 'number') {
      const len = token && typeof token.end === 'number'
        ? Math.max(1, token.end - token.start)
        : 1;
      err.length = len;
    }
  }
  return err;
}

function setPreciseMode(on) {
  preciseMode = on;
  if (typeof math !== 'undefined') {
    math.config(
      preciseMode ? { number: 'BigNumber', precision: 64 } : { number: 'number' }
    );
    if (preciseMode) {
      memory = math.bignumber(memory);
      lastResult = math.bignumber(lastResult);
    } else {
      memory = math.number(memory);
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
  const pushToken = (token) => {
    tokens.push(token);
  };
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const prev = tokens[tokens.length - 1];
    const canBeUnary =
      !prev || prev.type === 'operator' || (prev.type === 'paren' && prev.value === '(');
    if (ch === '-' && canBeUnary) {
      const next = expr[i + 1];
      if (/\d|\./.test(next)) {
        let num = '-';
        const start = i;
        let dotCount = 0;
        i++;
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          if (expr[i] === '.') {
            dotCount++;
            if (dotCount > 1) {
              throw createParseError('Invalid number literal', i, 1);
            }
          }
          num += expr[i];
          i++;
        }
        if (num === '-' || num === '-.') {
          throw createParseError('Invalid number literal', start, num.length);
        }
        const end = i;
        pushToken({ type: 'number', value: num, start, end });
        let unit = '';
        const unitStart = i;
        while (i < expr.length && /[A-Za-z]/.test(expr[i])) {
          unit += expr[i];
          i++;
        }
        if (unit) pushToken({ type: 'unit', value: unit, start: unitStart, end: i });
        continue;
      }
      pushToken({ type: 'number', value: '0', start: i, end: i + 1 });
      pushToken({ type: 'operator', value: '-', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      const start = i;
      let dotCount = ch === '.' ? 1 : 0;
      i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === '.') {
          dotCount++;
          if (dotCount > 1) {
            throw createParseError('Invalid number literal', i, 1);
          }
        }
        num += expr[i];
        i++;
      }
      if (num === '.' || num === '-.') {
        throw createParseError('Invalid number literal', start, num.length);
      }
      const end = i;
      pushToken({ type: 'number', value: num, start, end });
      let unit = '';
      const unitStart = i;
      while (i < expr.length && /[A-Za-z]/.test(expr[i])) {
        unit += expr[i];
        i++;
      }
      if (unit) pushToken({ type: 'unit', value: unit, start: unitStart, end: i });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const start = i;
      const idMatch = expr.slice(i).match(/^[A-Za-z]+/);
      const id = idMatch ? idMatch[0] : ch;
      i += id.length;
      const end = i;
      if (expr[i] === '(') {
        pushToken({ type: 'func', value: id, start, end });
      } else {
        pushToken({ type: 'id', value: id, start, end });
      }
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      const token = {
        type: ch === '(' || ch === ')' ? 'paren' : ch === ',' ? 'comma' : 'operator',
        value: ch,
        start: i,
        end: i + 1,
      };
      pushToken(token);
      i++;
      continue;
    }
    throw createParseError(`Unexpected '${ch}'`, i, 1);
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
        throw createParseError('Mismatched parenthesis', token.start, token.end - token.start);
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
      throw createParseError('Mismatched parenthesis', op.start, op.end - op.start);
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
      if (!stack.length) {
        throw createParseError('Missing value for unit', token.start, token.end - token.start);
      }
      const a = stack.pop();
      try {
        stack.push(math.multiply(a, math.unit(1, token.value)));
      } catch (err) {
        throw attachTokenLocation(err, token);
      }
    } else if (token.type === 'func') {
      if (!stack.length) {
        throw createParseError('Missing argument', token.start, token.end - token.start);
      }
      const a = stack.pop();
      const fn = math[token.value];
      try {
        stack.push(fn ? fn(a) : a);
      } catch (err) {
        throw attachTokenLocation(err, token);
      }
    } else if (token.type === 'operator') {
      if (stack.length < 2) {
        throw createParseError('Missing operand', token.start, token.end - token.start);
      }
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
      try {
        stack.push(res);
      } catch (err) {
        throw attachTokenLocation(err, token);
      }
    }
  }
  if (stack.length !== 1) {
    const last = rpn[rpn.length - 1];
    throw createParseError('Invalid expression', last ? last.start : 0, last ? last.end - last.start : 1);
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
  const val = evaluate(expr);
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? math.bignumber(val)
      : parseFloat(val);
  memory = preciseMode ? math.add(memory, num) : memory + num;
  return memory;
}

function memorySubtract(expr) {
  const val = evaluate(expr);
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? math.bignumber(val)
      : parseFloat(val);
  memory = preciseMode ? math.subtract(memory, num) : memory - num;
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
