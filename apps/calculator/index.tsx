'use client';

import dynamic from 'next/dynamic';
import { useMemo, useReducer } from 'react';
import ModeSwitcher, { type Mode } from './components/ModeSwitcher';
import Tape from './components/Tape';
import FormulaEditor from './components/FormulaEditor';
import MemorySlots from './components/MemorySlots';
import { useFormulas } from './formulas';
import { useVariables } from './state';
import { baseBreakdown, safeEvaluate, type AngleUnit, type Base } from './engine';

const GraphPanel = dynamic(() => import('./components/GraphPanel'), { ssr: false });

type HistoryEntry = { expr: string; result: string };

interface CalcState {
  expression: string;
  displayValue: string;
  mode: Mode;
  angleUnit: AngleUnit;
  base: Base;
  preciseMode: boolean;
  history: HistoryEntry[];
  undoStack: string[];
  redoStack: string[];
  error: { message: string; index: number } | null;
}

type Action =
  | { type: 'input'; value: string }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setAngle'; angle: AngleUnit }
  | { type: 'setBase'; base: Base }
  | { type: 'togglePrecise' }
  | { type: 'evaluate'; result: string }
  | { type: 'error'; message: string; index: number }
  | { type: 'recall'; value: string };

const initialState: CalcState = {
  expression: '',
  displayValue: '0',
  mode: 'basic',
  angleUnit: 'rad',
  base: 10,
  preciseMode: false,
  history: [],
  undoStack: [],
  redoStack: [],
  error: null,
};

function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case 'input':
      return { ...state, expression: state.expression + action.value, displayValue: state.expression + action.value, undoStack: [...state.undoStack, state.expression], redoStack: [], error: null };
    case 'clear':
      return { ...state, expression: '', displayValue: '0', undoStack: [...state.undoStack, state.expression], redoStack: [], error: null };
    case 'backspace':
      return { ...state, expression: state.expression.slice(0, -1), displayValue: state.expression.slice(0, -1) || '0', undoStack: [...state.undoStack, state.expression], redoStack: [], error: null };
    case 'undo': {
      if (!state.undoStack.length) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return { ...state, expression: prev, displayValue: prev || '0', undoStack: state.undoStack.slice(0, -1), redoStack: [state.expression, ...state.redoStack], error: null };
    }
    case 'redo': {
      if (!state.redoStack.length) return state;
      const [next, ...rest] = state.redoStack;
      return { ...state, expression: next, displayValue: next || '0', undoStack: [...state.undoStack, state.expression], redoStack: rest, error: null };
    }
    case 'setMode': return { ...state, mode: action.mode, error: null };
    case 'setAngle': return { ...state, angleUnit: action.angle };
    case 'setBase': return { ...state, base: action.base };
    case 'togglePrecise': return { ...state, preciseMode: !state.preciseMode };
    case 'evaluate':
      return { ...state, displayValue: action.result, expression: action.result, history: [{ expr: state.expression, result: action.result }, ...state.history].slice(0, 20), error: null };
    case 'error': return { ...state, error: { message: action.message, index: action.index } };
    case 'recall': return { ...state, expression: action.value, displayValue: action.value, error: null };
    default: return state;
  }
}

const BUTTONS = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '%', '+', '(', ')', '^'];
const SCI = ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan(', 'sqrt(', 'cbrt(', 'abs(', 'ln(', 'log10(', 'exp(', 'pow(', 'floor(', 'ceil(', 'round(', 'mod(', 'pi', 'e', '!'];
const PROG = ['A', 'B', 'C', 'D', 'E', 'F', '&', '|', '^', '~', '<<', '>>'];

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [formulas, setFormulas] = useFormulas();
  const [vars, setVars] = useVariables();

  const statusMessage = state.error ? `Error: ${state.error.message}` : `Mode ${state.mode} active`;
  const breakdown = useMemo(() => (state.mode === 'programmer' ? baseBreakdown(state.displayValue) : null), [state.mode, state.displayValue]);

  const runEval = () => {
    const result = safeEvaluate(state.expression, {
      mode: state.mode,
      preciseMode: state.preciseMode,
      angleUnit: state.angleUnit,
      base: state.base,
      variables: vars,
      ans: state.displayValue,
      bitWidth: 64,
    });
    if (result.ok) dispatch({ type: 'evaluate', result: result.value });
    else dispatch({ type: 'error', message: result.error.message, index: result.error.index });
  };

  return (
    <div className="calculator space-y-4 p-4 text-[color:var(--kali-text)]">
      <div className="flex flex-wrap items-center gap-2">
        <ModeSwitcher mode={state.mode} onChange={(mode) => dispatch({ type: 'setMode', mode })} />
        <button type="button" aria-label="toggle precise mode" onClick={() => dispatch({ type: 'togglePrecise' })} className="rounded border border-[color:var(--kali-border)] px-2 py-1 text-xs">Precise: {state.preciseMode ? 'On' : 'Off'}</button>
        <label className="text-xs">Angle
          <select aria-label="angle unit" value={state.angleUnit} onChange={(e) => dispatch({ type: 'setAngle', angle: e.target.value as AngleUnit })} className="ml-1 rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-1 py-0.5">
            <option value="rad">Rad</option>
            <option value="deg">Deg</option>
          </select>
        </label>
        {state.mode === 'programmer' && (
          <label className="text-xs">Base
            <select aria-label="number base" value={state.base} onChange={(e) => dispatch({ type: 'setBase', base: Number(e.target.value) as Base })} className="ml-1 rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-1 py-0.5">
              <option value={2}>BIN</option><option value={8}>OCT</option><option value={10}>DEC</option><option value={16}>HEX</option>
            </select>
          </label>
        )}
      </div>

      <div>
        <label htmlFor="display" className="sr-only">Calculator display</label>
        <input id="display" value={state.expression} onChange={(e) => dispatch({ type: 'recall', value: e.target.value })} className={`w-full rounded-xl border px-3 py-3 text-right text-2xl ${state.error ? 'border-red-500' : 'border-[color:var(--kali-border)]'} bg-[var(--kali-panel)]`} />
        <div role="status" aria-live="polite" className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">{statusMessage}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {BUTTONS.map((button) => <button key={button} type="button" onClick={() => dispatch({ type: 'input', value: button })} className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-2" aria-label={button}>{button}</button>)}
        <button type="button" onClick={() => dispatch({ type: 'backspace' })} aria-label="backspace" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-2">⌫</button>
        <button type="button" onClick={() => dispatch({ type: 'clear' })} aria-label="clear" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-2">C</button>
        <button type="button" onClick={() => dispatch({ type: 'undo' })} aria-label="undo" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-2">Undo</button>
        <button type="button" onClick={() => dispatch({ type: 'redo' })} aria-label="redo" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-2">Redo</button>
        <button type="button" data-action="equals" onClick={runEval} aria-label="equals" className="col-span-4 rounded border border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_20%,transparent)] px-2 py-2">=</button>
      </div>

      {state.mode !== 'basic' && (
        <div className="grid grid-cols-3 gap-2">
          {(state.mode === 'scientific' ? SCI : PROG).map((item) => (
            <button key={item} type="button" onClick={() => dispatch({ type: 'input', value: item })} className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-1 text-xs">{item}</button>
          ))}
        </div>
      )}

      {state.mode === 'programmer' && breakdown && (
        <section className="rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3 text-xs">
          <p>BIN: {breakdown.bin}</p><p>OCT: {breakdown.oct}</p><p>DEC: {breakdown.dec}</p><p>HEX: {breakdown.hex}</p>
        </section>
      )}

      {state.mode === 'scientific' && /\bx\b/i.test(state.expression) && <GraphPanel expression={state.expression} angleUnit={state.angleUnit} />}

      <Tape entries={state.history} onRecall={(value) => dispatch({ type: 'recall', value })} />
      <MemorySlots
        memory={vars}
        onStore={(name) => { if (name) setVars((prev) => ({ ...prev, [name]: state.displayValue })); }}
        onInsert={(name) => dispatch({ type: 'input', value: name })}
        onDelete={(name) => setVars((prev) => { const copy = { ...prev }; delete copy[name]; return copy; })}
      />
      <FormulaEditor
        formulas={formulas}
        onAdd={(name, expression) => { if (name && expression) setFormulas((prev) => [...prev, { name, expr: expression }]); }}
        onInsert={(expression) => dispatch({ type: 'input', value: expression })}
      />
    </div>
  );
}
