import React, { useState, useEffect } from 'react';
import Tape, { TapeEntry } from './Tape';
import usePersistentState from '../../../hooks/usePersistentState';

// --- Simple expression parser using the shunting-yard algorithm ---
const FUNCTIONS = ['sin', 'cos', 'tan', 'sqrt', 'log'];
const OPERATORS = {
  '+': { precedence: 2, assoc: 'L', exec: (a, b) => a + b },
  '-': { precedence: 2, assoc: 'L', exec: (a, b) => a - b },
  '*': { precedence: 3, assoc: 'L', exec: (a, b) => a * b },
  '/': { precedence: 3, assoc: 'L', exec: (a, b) => a / b },
  '^': { precedence: 4, assoc: 'R', exec: (a, b) => Math.pow(a, b) },
};

const tokenize = (expr: string): any[] => {
  const tokens: any[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      if (num.split('.').length > 2) throw new Error('Invalid number');
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i += 1;
      continue;
    }
    if (OPERATORS[ch]) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    // check for function names
    let matched = false;
    for (const fn of FUNCTIONS) {
      if (expr.startsWith(fn, i)) {
        tokens.push({ type: 'func', value: fn });
        i += fn.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    throw new Error('Invalid token');
  }
  return tokens;
};

const toRpn = (tokens: any[]): any[] => {
  const output: any[] = [];
  const ops: any[] = [];
  let prev: any = null;
  tokens.forEach((tok: any) => {
    if (tok.type === 'num') {
      output.push(tok);
    } else if (tok.type === 'func') {
      ops.push(tok);
    } else if (tok.type === 'op') {
      // handle unary minus
      if (
        tok.value === '-' &&
        (prev === null || prev.type === 'op' || prev.value === '(')
      ) {
        ops.push({ type: 'func', value: 'neg' });
      } else {
        while (
          ops.length > 0 &&
          ops[ops.length - 1].type === 'op' &&
          ((OPERATORS[ops[ops.length - 1].value].precedence >
            OPERATORS[tok.value].precedence) ||
            (OPERATORS[ops[ops.length - 1].value].precedence ===
              OPERATORS[tok.value].precedence &&
              OPERATORS[tok.value].assoc === 'L'))
        ) {
          output.push(ops.pop());
        }
        ops.push(tok);
      }
    } else if (tok.value === '(') {
      ops.push(tok);
    } else if (tok.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop());
      }
      if (!ops.length) throw new Error('Mismatched parentheses');
      ops.pop(); // remove '('
      if (ops.length && ops[ops.length - 1].type === 'func') {
        output.push(ops.pop());
      }
    }
    prev = tok;
  });
  while (ops.length) {
    const op = ops.pop();
    if (op.value === '(' || op.value === ')') throw new Error('Mismatched parentheses');
    output.push(op);
  }
  return output;
};

const evalRpn = (rpn: any[]): number => {
  const stack: number[] = [];
  rpn.forEach((tok: any) => {
    if (tok.type === 'num') {
      stack.push(tok.value);
    } else if (tok.type === 'op') {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid Expression');
      stack.push(OPERATORS[tok.value].exec(a, b));
    } else if (tok.type === 'func') {
      const a = stack.pop();
      if (a === undefined) throw new Error('Invalid Expression');
      switch (tok.value) {
        case 'sin':
          stack.push(Math.sin(a));
          break;
        case 'cos':
          stack.push(Math.cos(a));
          break;
        case 'tan':
          stack.push(Math.tan(a));
          break;
        case 'sqrt':
          stack.push(Math.sqrt(a));
          break;
        case 'log':
          stack.push(Math.log(a));
          break;
        case 'neg':
          stack.push(-a);
          break;
        default:
          throw new Error('Unknown function');
      }
    }
  });
  if (stack.length !== 1 || Number.isNaN(stack[0])) throw new Error('Invalid Expression');
  return stack[0];
};

export const evaluateExpression = (expression: string): string => {
  const trimmed = String(expression).trim();
  // handle quoted strings
  if (/^(['"]).*\1$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  try {
    const tokens = tokenize(trimmed);
    const rpn = toRpn(tokens);
    const result = evalRpn(rpn);
    if (!Number.isFinite(result)) return 'Invalid Expression';
    return String(result);
  } catch {
    return 'Invalid Expression';
  }
};

const Calc: React.FC = () => {
  const [display, setDisplay] = useState('');
  const [tape, setTape, resetTape] = usePersistentState<TapeEntry[]>(
    'calc-tape',
    () => [],
    (v): v is TapeEntry[] => Array.isArray(v) && v.every(
      (e: any) => typeof e.expr === 'string' && typeof e.result === 'string',
    ),
  );
  const [memory, setMemory] = usePersistentState<number>(
    'calc-memory',
    0,
    (v): v is number => typeof v === 'number',
  );

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(display);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const handleEquals = () => {
    const expr = display;
    const result = evaluateExpression(expr);
    setDisplay(result);
    if (result !== 'Invalid Expression') {
      setTape((prev) => [...prev, { expr, result }]);
    }
  };

  const handleClick = (btn: any) => {
    if (btn.type === 'clear') {
      setDisplay('');
    } else if (btn.type === 'mplus') {
      const val = parseFloat(display);
      if (!Number.isNaN(val)) setMemory((m) => m + val);
    } else if (btn.type === 'mminus') {
      const val = parseFloat(display);
      if (!Number.isNaN(val)) setMemory((m) => m - val);
    } else if (btn.type === 'mrecall') {
      setDisplay(String(memory));
    } else if (btn.label === '=') {
      handleEquals();
    } else {
      setDisplay((prev) => prev + (btn.value || btn.label));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        setDisplay((prev) => prev + e.key);
      } else if ('+-*/^.()'.includes(e.key)) {
        e.preventDefault();
        setDisplay((prev) => prev + e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDisplay((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [display]);

  const buttons = [
    { label: '7' }, { label: '8' }, { label: '9' }, { label: '/', ariaLabel: 'divide' },
    { label: '4' }, { label: '5' }, { label: '6' }, { label: '*', ariaLabel: 'multiply' },
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '-', ariaLabel: 'subtract' },
    { label: '0' }, { label: '.' }, { label: '=', ariaLabel: 'equals' }, { label: '+', ariaLabel: 'add' },
    { label: '(', ariaLabel: 'open parenthesis' }, { label: ')', ariaLabel: 'close parenthesis' }, { label: '^', ariaLabel: 'power' }, { label: 'sqrt', value: 'sqrt(', ariaLabel: 'square root' },
    { label: 'sin', value: 'sin(', ariaLabel: 'sine' }, { label: 'cos', value: 'cos(', ariaLabel: 'cosine' }, { label: 'tan', value: 'tan(', ariaLabel: 'tangent' }, { label: 'log', value: 'log(', ariaLabel: 'logarithm' },
    { label: 'M+', type: 'mplus', ariaLabel: 'memory add' }, { label: 'M-', type: 'mminus', ariaLabel: 'memory subtract' }, { label: 'MR', type: 'mrecall', ariaLabel: 'memory recall' }, { label: 'C', type: 'clear', ariaLabel: 'clear' },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex">
      <div className="flex flex-col flex-grow">
        <div className="mb-4 flex items-start">
          <div
            data-testid="calc-display"
            className="flex-1 h-16 bg-black text-right px-2 py-1 rounded overflow-x-auto flex items-end justify-end text-2xl"
          >
            {display}
          </div>
          <button
            aria-label="copy"
            onClick={handleCopy}
            className="ml-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
          >
            Copy
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 flex-grow">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              aria-label={btn.ariaLabel || btn.label}
              className={`bg-gray-800 hover:bg-gray-700 rounded text-xl flex items-center justify-center ${
                btn.colSpan ? `col-span-${btn.colSpan}` : ''
              }`}
              onClick={() => handleClick(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
      <Tape entries={tape} onClear={resetTape} />
    </div>
  );
};

export default Calc;

export const displayTerminalCalc = (addFolder, openApp) => {
  return <Calc addFolder={addFolder} openApp={openApp} />;
};

