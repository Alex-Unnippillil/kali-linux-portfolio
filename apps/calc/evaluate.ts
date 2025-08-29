export type Token =
  | { type: 'number'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: string }
  | { type: 'func'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < expr.length; i += 1) {
    let c = expr[i];
    if (/\s/.test(c)) continue;
    if (
      c === '-' &&
      (i === 0 || '+-*/^('.includes(expr[i - 1])) &&
      /[0-9.]/.test(expr[i + 1])
    ) {
      let num = c;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      i -= 1;
      tokens.push({ type: 'number', value: num });
    } else if (/[0-9]/.test(c) || c === '.') {
      let num = c;
      while (i + 1 < expr.length && /[0-9.]/.test(expr[i + 1])) {
        i += 1;
        num += expr[i];
      }
      tokens.push({ type: 'number', value: num });
    } else if ('+-*/^'.includes(c)) {
      tokens.push({ type: 'operator', value: c });
    } else if (c === '(' || c === ')') {
      tokens.push({ type: 'paren', value: c });
    } else if (/[a-z]/i.test(c)) {
      let name = c;
      while (i + 1 < expr.length && /[a-z]/i.test(expr[i + 1])) {
        i += 1;
        name += expr[i];
      }
      tokens.push({ type: 'func', value: name });
    } else {
      throw new Error(`Invalid character: ${c}`);
    }
  }
  return tokens;
}

const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
const rightAssoc: Record<string, boolean> = { '^': true };

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  tokens.forEach((t) => {
    if (t.type === 'number') {
      out.push(t);
    } else if (t.type === 'func') {
      stack.push(t);
    } else if (t.type === 'operator') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (
          (top.type === 'operator' &&
            ((rightAssoc[t.value]
              ? precedence[t.value] < precedence[(top as any).value]
              : precedence[t.value] <= precedence[(top as any).value]))) ||
          top.type === 'func'
        ) {
          out.push(stack.pop()!);
        } else {
          break;
        }
      }
      stack.push(t);
    } else if (t.value === '(') {
      stack.push(t);
    } else if (t.value === ')') {
      while (stack.length && stack[stack.length - 1].value !== '(') {
        out.push(stack.pop()!);
      }
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === 'func') {
        out.push(stack.pop()!);
      }
    }
  });
  while (stack.length) out.push(stack.pop()!);
  return out;
}

export function evaluate(expr: string, big = false): string {
  const tokens = toRPN(tokenize(expr));
  const stack: (number | bigint)[] = [];
  tokens.forEach((t) => {
    if (t.type === 'number') {
      if (big) {
        if (t.value.includes('.')) throw new Error('No decimals in big mode');
        stack.push(BigInt(t.value));
      } else {
        stack.push(parseFloat(t.value));
      }
    } else if (t.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid expression');
      if (big) {
        const ai = BigInt(a as any);
        const bi = BigInt(b as any);
        let r: bigint;
        switch (t.value) {
          case '+':
            r = ai + bi;
            break;
          case '-':
            r = ai - bi;
            break;
          case '*':
            r = ai * bi;
            break;
          case '/':
            r = ai / bi;
            break;
          case '^': {
            let res = 1n;
            for (let i = 0n; i < bi; i += 1n) res *= ai;
            r = res;
            break;
          }
          default:
            throw new Error('Unknown operator');
        }
        stack.push(r);
      } else {
        const an = Number(a);
        const bn = Number(b);
        let r: number;
        switch (t.value) {
          case '+':
            r = an + bn;
            break;
          case '-':
            r = an - bn;
            break;
          case '*':
            r = an * bn;
            break;
          case '/':
            r = an / bn;
            break;
          case '^':
            r = an ** bn;
            break;
          default:
            throw new Error('Unknown operator');
        }
        stack.push(r);
      }
    } else if (t.type === 'func') {
      const a = stack.pop();
      if (a === undefined) throw new Error('Invalid expression');
      if (big) throw new Error('Functions unsupported in big mode');
      const an = Number(a);
      let r: number;
      switch (t.value) {
        case 'sin':
          r = Math.sin(an);
          break;
        case 'cos':
          r = Math.cos(an);
          break;
        case 'tan':
          r = Math.tan(an);
          break;
        case 'sqrt':
          r = Math.sqrt(an);
          break;
        default:
          throw new Error('Unknown function');
      }
      stack.push(r);
    }
  });
  if (stack.length !== 1) throw new Error('Invalid expression');
  const res = stack[0];
  return big ? (res as bigint).toString() : (res as number).toString();
}

export default evaluate;
