type Token = {
  type: 'number' | 'operator' | 'paren' | 'func' | 'id';
  value: string;
};

const FUNCTIONS: Record<string, (value: number) => number> = {
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: (value: number) => Math.log10(value),
  ln: Math.log,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  exp: Math.exp,
};

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const tokenize = (expr: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (
      ch === '-' &&
      (tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'operator' ||
        tokens[tokens.length - 1].value === '(')
    ) {
      let num = '-';
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const id = expr.slice(i).match(/^[A-Za-z]+/)?.[0] ?? '';
      i += id.length;
      if (expr[i] === '(') {
        tokens.push({ type: 'func', value: id.toLowerCase() });
      } else {
        tokens.push({ type: 'id', value: id.toLowerCase() });
      }
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({
        type: ch === '(' || ch === ')' ? 'paren' : 'operator',
        value: ch,
      });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected '${ch}'`);
  }
  return tokens;
};

const toRPN = (tokens: Token[]): Token[] => {
  const output: Token[] = [];
  const ops: Token[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc: Record<string, boolean> = { '^': true };

  tokens.forEach((token) => {
    if (token.type === 'number' || token.type === 'id') {
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
          output.push(ops.pop()!);
        } else {
          break;
        }
      }
      ops.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      ops.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop()!);
      }
      ops.pop();
      if (ops.length && ops[ops.length - 1].type === 'func') {
        output.push(ops.pop()!);
      }
    }
  });

  while (ops.length) {
    output.push(ops.pop()!);
  }

  return output;
};

const evalRPN = (tokens: Token[]): number => {
  const stack: number[] = [];
  tokens.forEach((token) => {
    if (token.type === 'number') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'id') {
      stack.push(CONSTANTS[token.value] ?? 0);
    } else if (token.type === 'func') {
      const a = stack.pop() ?? 0;
      const fn = FUNCTIONS[token.value];
      stack.push(fn ? fn(a) : a);
    } else if (token.type === 'operator') {
      const b = stack.pop() ?? 0;
      const a = stack.pop() ?? 0;
      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          stack.push(a / b);
          break;
        case '^':
          stack.push(Math.pow(a, b));
          break;
        default:
          break;
      }
    }
  });
  return stack.pop() ?? 0;
};

export const evaluateMathExpression = (expression: string): number => {
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  return evalRPN(rpn);
};
