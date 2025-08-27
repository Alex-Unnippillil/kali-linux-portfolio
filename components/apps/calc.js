import React, { useEffect, useRef, useState } from 'react';
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

const Sparkline = ({ data }) => {
  const width = 50;
  const height = 16;
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - ((d - min) / (max - min || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      className="text-green-400 ml-2"
      role="img"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const Plot = ({ data, reduceMotion }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !data.length) return;
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    const xs = data.map((p) => p[0]);
    const ys = data.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const points = data.map((p) => {
      const x = ((p[0] - minX) / (maxX - minX || 1)) * width;
      const y = height - ((p[1] - minY) / (maxY - minY || 1)) * height;
      return `${x},${y}`;
    });
    const polyline = svg.querySelector('polyline');
    if (reduceMotion) {
      polyline.setAttribute('points', points.join(' '));
      return;
    }
    let progress = 0;
    const draw = () => {
      progress += 2;
      polyline.setAttribute('points', points.slice(0, progress).join(' '));
      if (progress < points.length) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }, [data, reduceMotion]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="150"
      className="text-blue-400 mt-4"
      aria-label="graph"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const Calc = () => {
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useState([]);
  const [plotData, setPlotData] = useState([]);
  const [showPlot, setShowPlot] = useState(false);
  const workerRef = useRef(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (
      typeof Worker !== 'undefined' &&
      typeof URL !== 'undefined' &&
      URL.createObjectURL
    ) {
      const blob = new Blob([
        `self.onmessage=function(e){const expr=e.data.expression;let fn;try{fn=new Function('x','with(Math){return '+expr+';}');}catch(err){self.postMessage([]);return;}const pts=[];for(let x=-10;x<=10;x+=0.2){let y;try{y=fn(x);}catch(e){y=NaN;}pts.push([x,y]);}self.postMessage(pts);};`,
      ], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = (e) => setPlotData(e.data);
      workerRef.current = worker;
      return () => worker.terminate();
    }
  }, []);

  const handleClick = (btn) => {
    if (btn.type === 'clear') {
      setDisplay('');
      setHistory([]);
      setShowPlot(false);
      setPlotData([]);
    } else if (btn.type === 'plot') {
      if (display) {
        setShowPlot(true);
        workerRef.current && workerRef.current.postMessage({ expression: display });
      }
    } else if (btn.label === '=') {
      const result = evaluateExpression(display);
      setDisplay(result);
      if (result !== 'Invalid Expression') {
        setHistory((prev) => [...prev, { expr: display, result: Number(result) }]);
      }
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
    { label: 'Plot', type: 'plot', colSpan: 2, ariaLabel: 'plot expression' },
  ];

  const historyResults = history.map((h) => h.result);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div
        data-testid="calc-display"
        className="mb-2 h-16 bg-black text-right px-2 py-1 rounded overflow-x-auto flex items-end justify-end text-2xl"
      >
        {display}
      </div>
      <ul aria-live="polite" className="flex-1 overflow-y-auto mb-2 space-y-1">
        {history.map((h, i) => (
          <li key={i} className="flex justify-between items-center">
            <span>
              {h.expr} = {h.result}
            </span>
            <Sparkline data={historyResults.slice(0, i + 1)} />
          </li>
        ))}
      </ul>
      {showPlot && <Plot data={plotData} reduceMotion={reduceMotion.current} />}
      <div className="grid grid-cols-4 gap-2 mt-2">
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

