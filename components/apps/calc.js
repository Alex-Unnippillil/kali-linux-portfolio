import React, { useState } from 'react';
const Parser = require('expr-eval').Parser;

// configure parser similar to previous implementation
const parser = new Parser({
  operators: {
    add: true,
    concatenate: true,
    conditional: true,
    divide: true,
    factorial: true,
    multiply: true,
    power: true,
    remainder: true,
    subtract: true,

    logical: false,
    comparison: false,
    'in': false,
    assignment: true,
  },
});

export const evaluateExpression = (expression) => {
  let result = '';
  try {
    result = parser.evaluate(expression);
  } catch (e) {
    result = 'Invalid Expression';
  }
  return String(result);
};

const Calc = () => {
  const [display, setDisplay] = useState('');

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
    } else if (btn.label === '=') {
      setDisplay(evaluateExpression(display));
    } else {
      setDisplay((prev) => prev + (btn.value || btn.label));
    }
  };

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

