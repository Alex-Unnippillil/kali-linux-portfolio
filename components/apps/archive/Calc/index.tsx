// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Decimal, { add, subtract } from '../../../../utils/decimal';
import usePersistentState from '../../../../hooks/usePersistentState';
import { useHistory, HistoryEntry } from '../../../../calc/history';
import { evaluateMathExpression } from '../../../../utils/math-evaluator';

const formatNumber = (n: Decimal) => {
  if (n.isInteger()) return n.toString();
  return n.toDecimalPlaces(10).toString();
};

export const evaluateExpression = (expression: string) => {
  const trimmed = String(expression).trim();
  if (/^(['"]).*\1$/.test(trimmed)) return trimmed.slice(1, -1);
  if (/[<>]/.test(trimmed)) return 'Invalid Expression';
  try {
    const result = evaluateMathExpression(trimmed);
    const dec = new Decimal(result);
    if (!dec.isFinite()) return 'Invalid Expression';
    return formatNumber(dec);
  } catch {
    return 'Invalid Expression';
  }
};

interface CalcProps {
  addFolder?: any;
  openApp?: any;
}

const Calc: React.FC<CalcProps> = ({ addFolder, openApp }) => {
  void addFolder;
  void openApp;
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useHistory();
  const safeHistory = Array.isArray(history) ? history : [];
  const [memory, setMemory] = usePersistentState(
    'calc-memory',
    () => '0',
    (v): v is string => typeof v === 'string',
  );
  const [showSci, setShowSci] = useState(false);
  const [showDateDiff, setShowDateDiff] = useState(false);
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');

  const dateDiff = useMemo(() => {
    if (!date1 || !date2) return '';
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d1.getTime() - d2.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [date1, date2]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore clipboard errors
    }
  }, []);

  const evaluateAndRecord = useCallback(() => {
    const expr = display;
    const result = evaluateExpression(expr);
    setDisplay(result);
    if (result !== 'Invalid Expression') {
      setHistory((prev: any) => [
        { expr, result },
        ...((Array.isArray(prev) ? prev : []) as HistoryEntry[]),
      ].slice(0, 10));
    }
  }, [display, setHistory]);

  const handleButton = useCallback(
    (btn: any) => {
      if (btn.type === 'clear') {
        setDisplay('');
      } else if (btn.label === '=') {
        evaluateAndRecord();
      } else if (btn.type === 'delete') {
        setDisplay((prev) => prev.slice(0, -1));
      } else {
        setDisplay((prev) => prev + (btn.value || btn.label));
      }
    },
    [evaluateAndRecord],
  );

  const handleMemoryAdd = useCallback(() => {
    try {
      const val = evaluateMathExpression(display);
      if (!Number.isNaN(val))
        setMemory((m: string) => add(m, val).toString());
    } catch {
      // ignore invalid expression
    }
  }, [display, setMemory]);
  const handleMemorySubtract = useCallback(() => {
    try {
      const val = evaluateMathExpression(display);
      if (!Number.isNaN(val))
        setMemory((m: string) => subtract(m, val).toString());
    } catch {
      // ignore invalid expression
    }
  }, [display, setMemory]);
  const handleMemoryRecall = useCallback(() => {
    setDisplay(memory);
  }, [memory]);

  const handleScientific = useCallback(
    (op: string) => {
      let val: number;
      try {
        val = evaluateMathExpression(display);
      } catch {
        return;
      }
      if (Number.isNaN(val)) return;
      let result;
      switch (op) {
        case '%':
          result = val / 100;
          break;
        case 'sqrt':
          result = Math.sqrt(val);
          break;
        case 'square':
          result = Math.pow(val, 2);
          break;
        case 'reciprocal':
          result = 1 / val;
          break;
        case 'sign':
          result = -val;
          break;
        default:
          return;
      }
      setDisplay(formatNumber(new Decimal(result)));
    },
    [display],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        NumpadDivide: '/',
        NumpadMultiply: '*',
        NumpadSubtract: '-',
        NumpadAdd: '+',
        NumpadDecimal: '.',
        NumpadEnter: 'Enter',
      };
      const key = keyMap[e.code] || e.key;
      if (/^[0-9]$/.test(key) || ['+', '-', '*', '/', '.'].includes(key)) {
        setDisplay((prev) => prev + key);
      } else if (key === 'Enter') {
        evaluateAndRecord();
      } else if (key === 'Backspace') {
        setDisplay((prev) => prev.slice(0, -1));
      } else if (key.toLowerCase() === 'm') {
        if (e.shiftKey) {
          handleMemoryAdd();
        } else if (e.ctrlKey) {
          handleMemorySubtract();
        } else {
          handleMemoryRecall();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [evaluateAndRecord, handleMemoryAdd, handleMemorySubtract, handleMemoryRecall]);

  const buttons = [
    { label: '7' }, { label: '8' }, { label: '9' }, { label: '/', ariaLabel: 'divide' },
    { label: '4' }, { label: '5' }, { label: '6' }, { label: '*', ariaLabel: 'multiply' },
    { label: '1' }, { label: '2' }, { label: '3' }, { label: '-', ariaLabel: 'subtract' },
    { label: '0' }, { label: '.' }, { label: '=', ariaLabel: 'equals' }, { label: '+', ariaLabel: 'add' },
    { label: '(', ariaLabel: 'open parenthesis' }, { label: ')', ariaLabel: 'close parenthesis' }, { label: '^', ariaLabel: 'power' }, { label: 'C', type: 'clear', colSpan: 2, ariaLabel: 'clear' },
    { label: '\u232B', type: 'delete', ariaLabel: 'backspace' },
  ];

  const scientificButtons = [
    { label: '%', ariaLabel: 'percent', onClick: () => handleScientific('%') },
    { label: '\u221A', ariaLabel: 'square root', onClick: () => handleScientific('sqrt') },
    { label: 'x\u00B2', ariaLabel: 'square', onClick: () => handleScientific('square') },
    { label: '1/x', ariaLabel: 'reciprocal', onClick: () => handleScientific('reciprocal') },
    { label: '\u00B1', ariaLabel: 'toggle sign', onClick: () => handleScientific('sign') },
  ];

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex">
      <div className="flex flex-col flex-grow">
        <div className="mb-4 flex items-start">
          <div
            data-testid="calc-display"
            aria-live="polite"
            className="flex-1 h-16 bg-black text-right px-2 py-1 rounded overflow-x-auto flex items-end justify-end text-2xl"
          >
            {display}
          </div>
          <button
            aria-label="copy"
            onClick={() => handleCopy(display)}
            className="ml-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            Copy
          </button>
        </div>
        <div className="mb-2 flex space-x-2">
          <button
            aria-label="memory add"
            onClick={handleMemoryAdd}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            M+
          </button>
          <button
            aria-label="memory subtract"
            onClick={handleMemorySubtract}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            M-
          </button>
          <button
            aria-label="memory recall"
            onClick={handleMemoryRecall}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            MR
          </button>
          <button
            aria-label="toggle scientific"
            onClick={() => setShowSci((s) => !s)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            Sci
          </button>
          <button
            aria-label="toggle date diff"
            onClick={() => setShowDateDiff((s) => !s)}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            Date
          </button>
        </div>
        {showSci && (
          <div className="grid grid-cols-5 gap-2 mb-2">
            {scientificButtons.map((btn, idx) => (
              <button
                key={idx}
                aria-label={btn.ariaLabel}
                className="bg-gray-800 hover:bg-gray-700 rounded text-xl flex items-center justify-center min-w-[24px] min-h-[24px]"
                onClick={btn.onClick}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2 flex-grow">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              aria-label={btn.ariaLabel || btn.label}
              className={`bg-gray-800 hover:bg-gray-700 rounded text-xl flex items-center justify-center min-w-[24px] min-h-[24px] ${
                btn.colSpan ? `col-span-${btn.colSpan}` : ''
              }`}
              onClick={() => handleButton(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {showDateDiff && (
          <div className="mt-2 p-2 bg-gray-800 rounded text-sm">
            <div className="flex space-x-2">
              <input
                type="date"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-1"
              />
              <input
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="flex-1 bg-gray-700 text-white px-1"
              />
            </div>
            {dateDiff !== '' && <div className="mt-2 text-center">{dateDiff} days</div>}
          </div>
        )}
      </div>
      <div className="w-48 ml-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">History</span>
          <button
            aria-label="clear history"
            onClick={() => setHistory([])}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm min-w-[24px] min-h-[24px]"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-2 text-sm">
          {safeHistory.map(({ expr, result }, idx) => (
            <div key={idx} className="mb-1 flex items-center justify-between">
              <span>{`${expr} = ${result}`}</span>
              <button
                aria-label={`copy history ${idx}`}
                onClick={() => handleCopy(`${expr} = ${result}`)}
                className="ml-2 px-1 bg-gray-700 hover:bg-gray-600 rounded text-xs min-w-[24px] min-h-[24px]"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calc;

export const displayTerminalCalc = (addFolder: any, openApp: any) => {
  return <Calc addFolder={addFolder} openApp={openApp} />;
};
