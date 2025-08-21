import React, { useState } from 'react';
const Parser = require('expr-eval').Parser;
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

if (typeof window !== 'undefined') {
  ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);
}

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
  const [showGraph, setShowGraph] = useState(false);
  const [graphData, setGraphData] = useState(null);

  const generateGraph = (expression) => {
    try {
      const expr = parser.parse(expression);
      const fn = expr.toJSFunction('x');
      const labels = [];
      const data = [];
      for (let x = -10; x <= 10; x += 1) {
        labels.push(x);
        data.push(fn(x));
      }
      return {
        labels,
        datasets: [
          {
            label: 'f(x)',
            data,
            borderColor: 'rgb(34,197,94)',
            backgroundColor: 'rgba(34,197,94,0.3)',
          },
        ],
      };
    } catch (e) {
      return null;
    }
  };

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
      setShowGraph(false);
    } else if (btn.label === '=') {
      setDisplay(evaluateExpression(display));
      setShowGraph(false);
    } else if (btn.type === 'graph') {
      const data = generateGraph(display);
      if (data) {
        setGraphData(data);
        setShowGraph(true);
      } else {
        setDisplay('Invalid Expression');
      }
    } else {
      setDisplay((prev) => prev + (btn.value || btn.label));
    }
  };

  const buttons = [
    { label: '7' }, { label: '8' }, { label: '9' }, { label: '/' },
    { label: '4' }, { label: '5' }, { label: '6' }, { label: '*' },
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '-' },
    { label: '0' }, { label: '.' }, { label: '=' }, { label: '+' },
    { label: '(' }, { label: ')' }, { label: '^' }, { label: 'sqrt', value: 'sqrt(' },
    { label: 'sin', value: 'sin(' }, { label: 'cos', value: 'cos(' }, { label: 'tan', value: 'tan(' }, { label: 'log', value: 'log(' },
    { label: 'x' }, { label: 'Graph', type: 'graph', colSpan: 2 }, { label: 'C', type: 'clear', colSpan: 1 },
  ];

  return (
    <div className="w-72 mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-lg">
      <div
        data-testid="calc-display"
        className="mb-4 h-10 bg-black text-right px-2 py-1 rounded overflow-x-auto"
      >
        {display}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            className={`bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm sm:text-xl ${
              btn.colSpan ? `col-span-${btn.colSpan}` : ''
            }`}
            onClick={() => handleClick(btn)}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {showGraph && graphData && (
        <div className="mt-4 bg-white p-2 rounded">
          <Line data={graphData} />
        </div>
      )}
    </div>
  );
};

export default Calc;

export const displayTerminalCalc = (addFolder, openApp) => {
  return <Calc addFolder={addFolder} openApp={openApp} />;
};

