import React, { useEffect, useRef, useState } from 'react';
import { create, all } from 'mathjs';

// configure mathjs to use BigNumbers to avoid FP errors
const math = create(all, { number: 'BigNumber', precision: 64 });

export const evaluateExpression = (expression) => {
  try {
    const result = math.evaluate(expression);
    // reject boolean results from comparisons
    if (typeof result === 'boolean') return 'Invalid Expression';
    if (typeof result === 'string') return result;
    return math.format(result, { precision: 64 });
  } catch (e) {
    return 'Invalid Expression';
  }
};

const HISTORY_KEY = 'calcHistory';
const MAX_HISTORY = 10;

const Calc = () => {
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  // load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(Array.isArray(stored) ? stored.slice(0, MAX_HISTORY) : []);
    } catch {
      setHistory([]);
    }
  }, []);

  const addHistory = (expr, result) => {
    const entry = { expr, result };
    const newHistory = [entry, ...history].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch {
      // ignore storage errors
    }
  };

  const insertAtCursor = (text) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newValue = display.slice(0, start) + text + display.slice(end);
    setDisplay(newValue);
    requestAnimationFrame(() => {
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  };

  const evaluate = () => {
    const expr = display;
    const result = evaluateExpression(expr);
    addHistory(expr, result);
    setDisplay(result);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.selectionStart = el.selectionEnd = el.value.length;
        el.focus();
      }
    });
  };

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
    } else if (btn.label === '=') {
      evaluate();
    } else {
      insertAtCursor(btn.value || btn.label);
    }
  };

  // keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) return;
      const key = e.key;
      if (/^[0-9.+\-*/^()]$/.test(key)) {
        e.preventDefault();
        insertAtCursor(key);
        return;
      }
      if (key === 'Enter') {
        e.preventDefault();
        evaluate();
        return;
      }
      if (key === 'Backspace' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        const el = inputRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end && start > 0) {
          const newVal = display.slice(0, start - 1) + display.slice(end);
          setDisplay(newVal);
          requestAnimationFrame(() => {
            const pos = start - 1;
            el.selectionStart = el.selectionEnd = pos;
          });
        } else if (start !== end) {
          const newVal = display.slice(0, start) + display.slice(end);
          setDisplay(newVal);
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start;
          });
        }
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [display]);

  const buttons = [
    { label: '7' }, { label: '8' }, { label: '9' }, { label: '/', ariaLabel: 'divide' },
    { label: '4' }, { label: '5' }, { label: '6' }, { label: '*', ariaLabel: 'multiply' },
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '-', ariaLabel: 'subtract' },
    { label: '0' }, { label: '.' }, { label: '=', ariaLabel: 'equals' }, { label: '+', ariaLabel: 'add' },
    { label: '(', ariaLabel: 'open parenthesis' }, { label: ')', ariaLabel: 'close parenthesis' }, { label: '^', ariaLabel: 'power' }, { label: 'sqrt', value: 'sqrt(', ariaLabel: 'square root' },
    { label: 'sin', value: 'sin(', ariaLabel: 'sine' }, { label: 'cos', value: 'cos(', ariaLabel: 'cosine' }, { label: 'tan', value: 'tan(', ariaLabel: 'tangent' }, { label: 'log', value: 'log(', ariaLabel: 'logarithm' },
    { label: 'C', type: 'clear', colSpan: 2, ariaLabel: 'clear' },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <input
        data-testid="calc-input"
        ref={inputRef}
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        className="mb-4 h-16 bg-black text-right px-2 py-1 rounded overflow-x-auto text-2xl"
      />
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
      <button
        className="mt-2 bg-gray-800 hover:bg-gray-700 rounded p-2"
        aria-expanded={showHistory}
        onClick={() => setShowHistory((s) => !s)}
      >
        History
      </button>
      {showHistory && (
        <div
          data-testid="history-panel"
          className="mt-2 flex flex-col gap-1 overflow-y-auto"
        >
          {history.map((h, idx) => (
            <div key={idx} className="history-entry text-sm">
              {h.expr} = {h.result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Calc;

export const displayTerminalCalc = (addFolder, openApp) => {
  return <Calc addFolder={addFolder} openApp={openApp} />;
};

