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

  const handleClick = (value) => {
    if (value === 'C') {
      setDisplay('');
    } else if (value === '=') {
      setDisplay(evaluateExpression(display));
    } else {
      setDisplay((prev) => prev + value);
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
    'C',
  ];

  return (
    <div className="max-w-xs mx-auto p-4 bg-gray-800 text-white rounded-lg shadow-lg">
      <div
        data-testid="calc-display"
        className="mb-4 h-10 bg-black text-right px-2 py-1 rounded"
      >
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            className={`bg-gray-700 hover:bg-gray-600 p-2 rounded text-xl ${
              btn === 'C' ? 'col-span-4' : ''
            }`}
            onClick={() => handleClick(btn)}
          >
            {btn}
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

