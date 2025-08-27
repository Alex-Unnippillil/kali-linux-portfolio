import React, { useState, useEffect, useRef } from 'react';
import { create, all } from 'mathjs';

const math = create(all);
math.config({ number: 'BigNumber', precision: 64 });

export const evaluateExpression = (expression) => {
  try {
    const result = math.evaluate(expression);
    const type = math.typeOf(result);
    if (!['BigNumber', 'number', 'Fraction', 'string'].includes(type)) {
      return 'Invalid Expression';
    }
    if (type === 'string') {
      return result;
    }
    return math.format(result, { precision: 14 });
  } catch (e) {
    return 'Invalid Expression';
  }
};

const Calc = () => {
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const buttonRefs = useRef([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('calc-history') || '[]');
    setHistory(stored);
  }, []);

  const addHistory = (expr, result) => {
    const entry = `${expr} = ${result}`;
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 10);
      localStorage.setItem('calc-history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
    } else if (btn.label === '=') {
      const result = evaluateExpression(display);
      addHistory(display, result);
      setDisplay(result);
    } else {
      setDisplay((prev) => prev + (btn.value || btn.label));
    }
  };

  const handleArrowNavigation = (e) => {
    const btns = buttonRefs.current;
    const index = btns.indexOf(document.activeElement);
    const columns = 4;
    let nextIndex = index;
    switch (e.key) {
      case 'ArrowRight':
        if ((index + 1) % columns !== 0) nextIndex = index + 1;
        break;
      case 'ArrowLeft':
        if (index % columns !== 0) nextIndex = index - 1;
        break;
      case 'ArrowDown':
        if (index + columns < btns.length) nextIndex = index + columns;
        break;
      case 'ArrowUp':
        if (index - columns >= 0) nextIndex = index - columns;
        break;
      default:
        break;
    }
    btns[nextIndex]?.focus();
    e.preventDefault();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (/^[0-9.+\-*/()^]$/.test(key)) {
      e.preventDefault();
      setDisplay((prev) => prev + key);
      return;
    }
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      const result = evaluateExpression(display);
      addHistory(display, result);
      setDisplay(result);
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      setDisplay((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'Escape') {
      e.preventDefault();
      setDisplay('');
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      handleArrowNavigation(e);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const buttons = [
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
    { label: 'C', type: 'clear', colSpan: 2, ariaLabel: 'clear' },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <button
        onClick={() => setShowHistory((p) => !p)}
        aria-expanded={showHistory}
        className="mb-2 self-end bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
      >
        History
      </button>
      {showHistory && (
        <div
          data-testid="history-panel"
          className="mb-2 max-h-32 overflow-y-auto bg-gray-800 rounded p-2"
        >
          {history.map((entry, idx) => (
            <div data-testid="history-entry" key={idx} className="text-sm">
              {entry}
            </div>
          ))}
        </div>
      )}
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
            ref={(el) => (buttonRefs.current[idx] = el)}
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
  );
};

export default Calc;

export const displayTerminalCalc = (addFolder, openApp) => {
  return <Calc addFolder={addFolder} openApp={openApp} />;
};

