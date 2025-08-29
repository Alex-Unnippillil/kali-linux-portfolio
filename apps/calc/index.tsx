'use client';
import React, { useState, useEffect, useCallback } from 'react';
import evaluate from './evaluate';

interface TapeItem {
  expr: string;
  res: string;
}

const Calc: React.FC = () => {
  const [expr, setExpr] = useState('');
  const [big, setBig] = useState(false);
  const [tape, setTape] = useState<TapeItem[]>([]);
  const [memory, setMemory] = useState<bigint | number>(0);
  const [showSci, setShowSci] = useState(false);

  useEffect(() => {
    setShowSci(localStorage.getItem('calc-sci') === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('calc-sci', showSci ? '1' : '0');
  }, [showSci]);

  const calculate = () => {
    try {
      const res = evaluate(expr, big);
      setTape((prev) => [...prev, { expr, res }]);
      setExpr(res);
    } catch {
      setExpr('Error');
    }
  };

  const copyTape = useCallback(async () => {
    const text = tape.map((t) => `${t.expr} = ${t.res}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [tape]);
  const clearTape = useCallback(() => setTape([]), []);
  const undoTape = useCallback(() => setTape((prev) => prev.slice(0, -1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        undoTape();
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        copyTape();
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        clearTape();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tape, copyTape, clearTape, undoTape]);

  const append = (v: string) => setExpr((prev) => prev + v);
  const mPlus = () => {
    try {
      const val = evaluate(expr, big);
      setMemory((m) => (big ? (BigInt(m as any) + BigInt(val)) : (Number(m) + Number(val))));
    } catch {
      /* ignore */
    }
  };
  const mMinus = () => {
    try {
      const val = evaluate(expr, big);
      setMemory((m) => (big ? (BigInt(m as any) - BigInt(val)) : (Number(m) - Number(val))));
    } catch {
      /* ignore */
    }
  };
  const mRecall = () => setExpr(String(memory));

  return (
    <div className="w-full h-full bg-gray-900 text-white p-4 space-y-2">
      <input
        className="w-full text-black px-2 py-1"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') calculate();
        }}
      />
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => setBig((b) => !b)}
          className="px-2 py-1 bg-blue-600 rounded"
        >
          Big: {big ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          onClick={() => setShowSci((s) => !s)}
          aria-pressed={showSci}
          className="px-2 py-1 bg-blue-600 rounded"
        >
          Scientific
        </button>
      </div>
      <div className="flex space-x-2">
        <button onClick={mPlus} className="px-2 py-1 bg-gray-700 rounded">M+</button>
        <button onClick={mMinus} className="px-2 py-1 bg-gray-700 rounded">M−</button>
        <button onClick={mRecall} className="px-2 py-1 bg-gray-700 rounded">MR</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map((ch) => (
          ch === '=' ? (
            <button key={ch} onClick={calculate} className="px-2 py-1 bg-green-600 rounded">=</button>
          ) : (
            <button key={ch} onClick={() => append(ch)} className="px-2 py-1 bg-gray-700 rounded">{ch}</button>
          )
        ))}
        <button onClick={() => setExpr('')} className="col-span-2 px-2 py-1 bg-red-600 rounded">C</button>
        <button onClick={() => setExpr((v) => v.slice(0, -1))} className="col-span-2 px-2 py-1 bg-red-600 rounded">⌫</button>
      </div>
      {showSci && (
        <div className="grid grid-cols-4 gap-2">
          {['sin(','cos(','tan(','sqrt('].map((fn) => (
            <button key={fn} onClick={() => append(fn)} className="px-2 py-1 bg-gray-700 rounded">
              {fn.replace('(','')}
            </button>
          ))}
          <button onClick={() => append('(')} className="px-2 py-1 bg-gray-700 rounded">(</button>
          <button onClick={() => append(')')} className="px-2 py-1 bg-gray-700 rounded">)</button>
        </div>
      )}
      <div className="mt-4">
        <div className="flex space-x-2 mb-2">
          <button onClick={copyTape} className="px-2 py-1 bg-gray-700 rounded">Copy</button>
          <button onClick={undoTape} className="px-2 py-1 bg-gray-700 rounded">Undo</button>
          <button onClick={clearTape} className="px-2 py-1 bg-gray-700 rounded">Clear</button>
        </div>
        <ul className="text-sm max-h-40 overflow-auto">
          {tape.map((t, i) => (
            <li key={i}>{t.expr} = {t.res}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Calc;
