import React, { useState, useEffect, useCallback } from 'react';

// Supported function names
const functions = new Set(['sqrt', 'sin', 'cos', 'tan', 'log']);

const tokenize = (str) => {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (/[+\-*/^]/.test(ch)) {
      if (ch === '-' && (i === 0 || /[+\-*/^(]/.test(str[i - 1]))) {
        let j = i + 1;
        let num = '-';
        while (j < str.length && /[0-9.]/.test(str[j])) {
          num += str[j];
          j += 1;
        }
        if (num === '-') throw new Error('Invalid number');
        tokens.push(num);
        i = j;
      } else {
        tokens.push(ch);
        i += 1;
      }
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < str.length && /[0-9.]/.test(str[j])) j += 1;
      tokens.push(str.slice(i, j));
      i = j;
      continue;
    }
    if (/[a-z]/i.test(ch)) {
      let j = i;
      while (j < str.length && /[a-z]/i.test(str[j])) j += 1;
      const name = str.slice(i, j);
      if (!functions.has(name)) throw new Error('Unknown function');
      tokens.push(name);
      i = j;
      continue;
    }
    throw new Error('Invalid token');
  }
  return tokens;
};

const toRPN = (tokens) => {
  const out = [];
  const stack = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  tokens.forEach((t) => {
    if (!Number.isNaN(Number(t))) {
      out.push(t);
    } else if (functions.has(t)) {
      stack.push(t);
    } else if (t in prec) {
      while (
        stack.length &&
        ((stack[stack.length - 1] in prec &&
          (prec[stack[stack.length - 1]] > prec[t] ||
            (prec[stack[stack.length - 1]] === prec[t] && t !== '^'))))
      ) {
        out.push(stack.pop());
      }
      stack.push(t);
    } else if (t === '(') {
      stack.push(t);
    } else if (t === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') out.push(stack.pop());
      if (stack.pop() !== '(') throw new Error('Mismatched parentheses');
      if (functions.has(stack[stack.length - 1])) out.push(stack.pop());
    } else {
      throw new Error('Unknown token');
    }
  });
  while (stack.length) {
    const op = stack.pop();
    if (op === '(') throw new Error('Mismatched parentheses');
    out.push(op);
  }
  return out;
};

const evalRPN = (rpn) => {
  const stack = [];
  const func = {
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
  };
  rpn.forEach((t) => {
    if (!Number.isNaN(Number(t))) {
      stack.push(Number(t));
    } else if (t in func) {
      const a = stack.pop();
      stack.push(func[t](a));
    } else {
      const b = stack.pop();
      const a = stack.pop();
      switch (t) {
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
          stack.push(a ** b);
          break;
        default:
          throw new Error('Unknown operator');
      }
    }
  });
  if (stack.length !== 1 || Number.isNaN(stack[0]) || !Number.isFinite(stack[0])) throw new Error('Invalid');
  return stack[0];
};

export const evaluateExpression = (expression) => {
  const expr = expression.trim();
  if (/^['"].*['"]$/.test(expr)) return expr.slice(1, -1);
  try {
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens);
    const result = evalRPN(rpn);
    return String(result);
  } catch (e) {
    return 'Invalid Expression';
  }
};

const Calc = () => {
  const [display, setDisplay] = useState('');
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('calcHistory') || '[]');
    setHistory(stored);
  }, []);

  const handleEvaluation = useCallback(() => {
    const result = evaluateExpression(display);
    if (result !== 'Invalid Expression') {
      const entry = `${display} = ${result}`;
      const newHistory = [...history, entry].slice(-50);
      setHistory(newHistory);
      localStorage.setItem('calcHistory', JSON.stringify(newHistory));
    }
    setDisplay(result);
  }, [display, history]);

  const handleMemory = useCallback(
    (action) => {
      if (action === 'recall') {
        setDisplay(String(memory));
        return;
      }
      const val = parseFloat(evaluateExpression(display));
      if (Number.isNaN(val)) return;
      setMemory((prev) => (action === 'add' ? prev + val : prev - val));
    },
    [display, memory]
  );

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
    } else if (btn.type === 'memory') {
      handleMemory(btn.action);
    } else if (btn.label === '=') {
      handleEvaluation();
    } else {
      setDisplay((prev) => prev + (btn.value || btn.label));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          handleMemory('recall');
          return;
        }
        if (e.key === '+') {
          e.preventDefault();
          handleMemory('add');
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          handleMemory('subtract');
          return;
        }
      }
      if (/^[0-9.+\-*/^()]$/.test(e.key)) {
        e.preventDefault();
        setDisplay((prev) => prev + e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleEvaluation();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDisplay((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDisplay('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, memory, history, handleEvaluation, handleMemory]);

  const buttons = [
    { label: 'M+', type: 'memory', action: 'add' },
    { label: 'M-', type: 'memory', action: 'subtract' },
    { label: 'MR', type: 'memory', action: 'recall' },
    { label: 'C', type: 'clear' },
    { label: '7' },
    { label: '8' },
    { label: '9' },
    { label: '/', ariaLabel: 'divide' },
    { label: '4' },
    { label: '5' },
    { label: '6' },
    { label: '*', ariaLabel: 'multiply' },
    { label: '1' },
    { label: '2' },
    { label: '3' },
    { label: '-', ariaLabel: 'subtract' },
    { label: '0' },
    { label: '.' },
    { label: '=', ariaLabel: 'equals' },
    { label: '+', ariaLabel: 'add' },
    { label: '(', ariaLabel: 'open parenthesis' },
    { label: ')', ariaLabel: 'close parenthesis' },
    { label: '^', ariaLabel: 'power' },
    { label: 'sqrt', value: 'sqrt(', ariaLabel: 'square root' },
    { label: 'sin', value: 'sin(', ariaLabel: 'sine' },
    { label: 'cos', value: 'cos(', ariaLabel: 'cosine' },
    { label: 'tan', value: 'tan(', ariaLabel: 'tangent' },
    { label: 'log', value: 'log(', ariaLabel: 'logarithm' },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 h-24 bg-black text-right px-2 py-1 rounded overflow-y-auto text-sm">
        {history.map((h, idx) => (
          <div key={idx}>{h}</div>
        ))}
      </div>
      <div
        data-testid="calc-display"
        className="mb-4 h-16 bg-black text-right px-2 py-1 rounded overflow-x-auto flex items-end justify-end text-2xl"
      >
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2 flex-grow">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            aria-label={btn.ariaLabel || btn.label}
            className="bg-gray-800 hover:bg-gray-700 rounded text-xl flex items-center justify-center"
            onClick={() => handleClick(btn)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calc;

export const displayCalc = (addFolder, openApp) => (
  <Calc addFolder={addFolder} openApp={openApp} />
);

