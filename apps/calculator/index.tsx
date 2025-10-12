'use client';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ModeSwitcher, { type Mode } from './components/ModeSwitcher';
import MemorySlots from './components/MemorySlots';
import FormulaEditor from './components/FormulaEditor';
import Tape from './components/Tape';

export default function Calculator() {
  const HISTORY_LIMIT = 10;
  const [history, setHistory] = usePersistentState<
    { expr: string; result: string }[]
  >(
    'calc-history',
    () => [],
    (v): v is { expr: string; result: string }[] =>
      Array.isArray(v) &&
      v.every(
        (item) =>
          typeof item?.expr === 'string' &&
          typeof item?.result === 'string',
      ),
  );
  const [mode, setMode] = useState<Mode>('basic');
  const [scientificActive, setScientificActive] = useState(false);
  const [programmerActive, setProgrammerActive] = useState(false);

  const baseBtnCls =
    'btn flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted';
  const keypadBtnCls =
    `${baseBtnCls} h-14 rounded-xl border border-white/5 bg-kali-surface px-0 text-lg text-kali-text shadow-sm hover:-translate-y-0.5 hover:bg-kali-muted/90`;
  const operatorBtnCls =
    'border-kali-control/60 bg-kali-control/10 text-kali-control hover:bg-kali-control/20 hover:text-kali-text focus-visible:ring-kali-control';
  const pillUtilityBtnCls =
    `${baseBtnCls} h-11 rounded-full border border-white/10 bg-white/5 px-5 text-sm uppercase tracking-wide text-kali-text/90 shadow-none hover:bg-white/10 hover:text-kali-control`;

  const keypadRows: Array<
    Array<{
      label: ReactNode;
      value?: string;
      action?: string;
      keyBinding?: string;
      ariaLabel: string;
      extraClassName?: string;
    }>
  > = [
    [
      { label: '(', value: '(', keyBinding: '(', ariaLabel: 'left parenthesis' },
      { label: ')', value: ')', keyBinding: ')', ariaLabel: 'right parenthesis' },
      {
        label: <span className="text-xs font-medium uppercase tracking-[0.3em]">mod</span>,
        value: 'mod(',
        ariaLabel: 'modulus',
        extraClassName: operatorBtnCls,
      },
      { label: 'π', value: 'pi', keyBinding: 'p', ariaLabel: 'pi constant' },
    ],
    [
      { label: '7', value: '7', keyBinding: '7', ariaLabel: 'seven' },
      { label: '8', value: '8', keyBinding: '8', ariaLabel: 'eight' },
      { label: '9', value: '9', keyBinding: '9', ariaLabel: 'nine' },
      {
        label: '÷',
        value: '/',
        keyBinding: '/',
        ariaLabel: 'divide',
        extraClassName: operatorBtnCls,
      },
    ],
    [
      { label: '4', value: '4', keyBinding: '4', ariaLabel: 'four' },
      { label: '5', value: '5', keyBinding: '5', ariaLabel: 'five' },
      { label: '6', value: '6', keyBinding: '6', ariaLabel: 'six' },
      {
        label: '×',
        value: '*',
        keyBinding: '*',
        ariaLabel: 'multiply',
        extraClassName: operatorBtnCls,
      },
    ],
    [
      { label: '1', value: '1', keyBinding: '1', ariaLabel: 'one' },
      { label: '2', value: '2', keyBinding: '2', ariaLabel: 'two' },
      { label: '3', value: '3', keyBinding: '3', ariaLabel: 'three' },
      {
        label: '−',
        value: '-',
        keyBinding: '-',
        ariaLabel: 'subtract',
        extraClassName: operatorBtnCls,
      },
    ],
    [
      { label: '0', value: '0', keyBinding: '0', ariaLabel: 'zero' },
      { label: '.', value: '.', keyBinding: '.', ariaLabel: 'decimal point' },
      { label: '%', value: '%', keyBinding: '%', ariaLabel: 'percent' },
      {
        label: '+',
        value: '+',
        keyBinding: '+',
        ariaLabel: 'add',
        extraClassName: operatorBtnCls,
      },
    ],
  ];

  useEffect(() => {
    let evaluate: any;
    let memoryAdd: any;
    let memorySubtract: any;
    let memoryRecall: any;
    let formatBase: any;
    let getLastResult: any;
    let setBase: any;
    let setPreciseMode: any;
    let setProgrammerMode: any;

    const load = async () => {
      if (typeof window !== 'undefined' && !(window as any).math) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src =
            'https://cdn.jsdelivr.net/npm/mathjs@13.2.3/lib/browser/math.js';
          script.onload = resolve as any;
          document.body.appendChild(script);
        });
      }
      const mod = await import('./main');
      evaluate = mod.evaluate;
      memoryAdd = mod.memoryAdd;
      memorySubtract = mod.memorySubtract;
      memoryRecall = mod.memoryRecall;
      formatBase = mod.formatBase;
      getLastResult = mod.getLastResult;
      setBase = mod.setBase;
      setPreciseMode = mod.setPreciseMode;
      setProgrammerMode = mod.setProgrammerMode;

      const display = document.getElementById('display') as HTMLInputElement;
      const buttons = document.querySelectorAll<HTMLButtonElement>('.btn');
      const historyToggle = document.getElementById('toggle-history');
      const historyEl = document.getElementById('history');
      const formulasToggle = document.getElementById('toggle-formulas');
      const formulasEl = document.getElementById('formulas');
      const baseSelect = document.getElementById('base-select') as HTMLSelectElement | null;
      const preciseToggle = document.getElementById('toggle-precise') as HTMLButtonElement | null;
      const scientificToggle = document.getElementById('toggle-scientific') as HTMLButtonElement | null;
      const programmerToggle = document.getElementById('toggle-programmer') as HTMLButtonElement | null;
      const scientificPanel = document.getElementById('scientific');
      const programmerPanel = document.getElementById('programmer');

      const insertAtCursor = (text: string) => {
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        const before = display.value.slice(0, start);
        const after = display.value.slice(end);
        display.value = before + text + after;
        const pos = start + text.length;
        display.selectionStart = display.selectionEnd = pos;
      };

      const handlers: Array<{ btn: HTMLButtonElement; handler: () => void }> = [];
      buttons.forEach((btn) => {
        const handler = () => {
          const action = btn.dataset.action;
          const value = btn.dataset.value || btn.textContent || '';

          if (action === 'clear') {
            display.value = '';
            return;
          }

          if (action === 'backspace') {
            display.value = display.value.slice(0, -1);
            return;
          }

          if (action === 'equals') {
            const expr = display.value;
            try {
              const result = evaluate(expr);
              setHistory((prev) =>
                [{ expr, result }, ...prev].slice(0, HISTORY_LIMIT),
              );
              display.value = result;
            } catch (e: any) {
              const idx = e.index || 0;
              display.classList.add('error');
              display.focus();
              display.setSelectionRange(idx, idx + 1);
            }
            return;
          }

          if (action === 'ans') {
            insertAtCursor(formatBase(getLastResult()));
            return;
          }

          if (action === 'mplus') {
            memoryAdd(display.value);
            return;
          }

          if (action === 'mminus') {
            memorySubtract(display.value);
            return;
          }

          if (action === 'mr') {
            display.value = formatBase(memoryRecall());
            return;
          }

          insertAtCursor(value);
          display.focus();
        };
        btn.addEventListener('click', handler);
        handlers.push({ btn, handler });
      });

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          (document.querySelector('.btn[data-action="equals"]') as HTMLButtonElement)?.click();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          display.value = display.value.slice(0, -1);
          return;
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          display.value = '';
          return;
        }
        const btn = document.querySelector<HTMLButtonElement>(
          `.btn[data-key~="${e.key}"]`,
        );
        if (btn) {
          e.preventDefault();
          btn.click();
          return;
        }
        if (
          e.target !== display &&
          /^[-+*/0-9A-F().]$/i.test(e.key)
        ) {
          e.preventDefault();
          insertAtCursor(e.key);
        }
      };
      document.addEventListener('keydown', keyHandler);

      historyToggle?.addEventListener('click', () => {
        historyEl?.classList.toggle('hidden');
      });

      formulasToggle?.addEventListener('click', () => {
        formulasEl?.classList.toggle('hidden');
      });

      baseSelect?.addEventListener('change', () => {
        setBase(parseInt(baseSelect.value, 10));
      });

      if (preciseToggle) {
        let preciseOn = preciseToggle.getAttribute('aria-pressed') === 'true';
        const handlePrecise = () => {
          preciseOn = !preciseOn;
          preciseToggle.setAttribute('aria-pressed', String(preciseOn));
          setPreciseMode?.(preciseOn);
        };
        preciseToggle.addEventListener('click', handlePrecise);
        handlers.push({ btn: preciseToggle, handler: handlePrecise });
      }

      if (scientificToggle) {
        let isActive = scientificToggle.getAttribute('aria-pressed') === 'true';
        const syncScientific = (next: boolean) => {
          isActive = next;
          scientificToggle.setAttribute('aria-pressed', String(next));
          scientificPanel?.classList.toggle('hidden', !next);
          setScientificActive(next);
        };
        syncScientific(isActive);
        const handleScientific = () => {
          syncScientific(!isActive);
        };
        scientificToggle.addEventListener('click', handleScientific);
        handlers.push({ btn: scientificToggle, handler: handleScientific });
      }

      if (programmerToggle) {
        let isActive = programmerToggle.getAttribute('aria-pressed') === 'true';
        const syncProgrammer = (next: boolean) => {
          isActive = next;
          programmerToggle.setAttribute('aria-pressed', String(next));
          programmerPanel?.classList.toggle('hidden', !next);
          setProgrammerMode?.(next);
          setProgrammerActive(next);
        };
        syncProgrammer(isActive);
        const handleProgrammer = () => {
          syncProgrammer(!isActive);
        };
        programmerToggle.addEventListener('click', handleProgrammer);
        handlers.push({ btn: programmerToggle, handler: handleProgrammer });
      }

      return () => {
        handlers.forEach(({ btn, handler }) =>
          btn.removeEventListener('click', handler),
        );
        document.removeEventListener('keydown', keyHandler);
      };
    };

    load();
  }, [setHistory]);

  const activePanels = useMemo(() => {
    const panels: string[] = [];
    if (scientificActive) panels.push('Scientific');
    if (programmerActive) panels.push('Programmer');
    return panels;
  }, [programmerActive, scientificActive]);

  const recentHistory = useMemo(
    () => history.slice(0, 3),
    [history],
  );

  return (
    <div className="calculator mx-auto flex w-full max-w-lg flex-col gap-6 rounded-3xl bg-kali-muted p-6 text-kali-text shadow-[0_35px_80px_-30px_rgba(15,15,20,0.9)]">
      <header className="flex items-center justify-between text-sm text-slate-300">
        <button
          type="button"
          onClick={() => {
            const display = document.getElementById('display') as HTMLInputElement | null;
            if (display) display.value = display.value.slice(0, -1);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-kali-text/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
          Undo
        </button>
        <div className="flex items-center gap-3">
          <ModeSwitcher onChange={(nextMode) => setMode(nextMode)} />
          <div className="flex items-center gap-2 text-slate-500">
            <button
              id="toggle-history"
              className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-kali-text/60 transition hover:border-white/10 hover:text-kali-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
              aria-pressed="false"
              aria-label="toggle history"
              aria-describedby="calculator-history-toggle-desc"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
              <span>History</span>
              <span id="calculator-history-toggle-desc" className="sr-only">
                Show or hide the calculation history panel
              </span>
            </button>
            <button
              id="toggle-formulas"
              className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-wide text-kali-text/60 transition hover:border-white/10 hover:text-kali-text focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
              aria-pressed="false"
              aria-label="toggle formulas"
              aria-describedby="calculator-formulas-toggle-desc"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M4 4h16" />
                <path d="M4 10h10" />
                <path d="M4 16h7" />
                <path d="M4 22h4" />
                <path d="M14 10l6 12" />
              </svg>
              <span>Formulas</span>
              <span id="calculator-formulas-toggle-desc" className="sr-only">
                Show or hide the saved formula snippets
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-3 rounded-2xl border border-white/5 bg-kali-dark p-4 shadow-inner">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Expression</span>
          <span>Result</span>
        </div>
        <label htmlFor="display" className="sr-only" id="calculator-display-label">
          Calculator display
        </label>
        <input
          id="display"
          className="display w-full rounded-2xl border border-white/5 bg-kali-dark/95 px-4 py-4 text-right text-3xl font-semibold tracking-tight text-kali-text shadow-inner placeholder:text-kali-text/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-dark"
          placeholder="0"
          aria-labelledby="calculator-display-label"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-slate-300">
        <button
          id="toggle-precise"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
          aria-pressed="false"
          aria-label="toggle precise mode"
        >
          Precise
        </button>
        <button
          id="toggle-scientific"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
          aria-pressed="false"
          aria-label="toggle scientific mode"
        >
          Scientific
        </button>
        <button
          id="toggle-programmer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-kali-muted"
          aria-pressed="false"
          aria-label="toggle programmer mode"
        >
          Programmer
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex w-full items-center justify-end gap-2">
          <button
            className={pillUtilityBtnCls}
            data-action="clear"
            data-key="Escape c"
            aria-label="clear"
          >
            Clear
          </button>
          <button
            className={pillUtilityBtnCls}
            data-action="backspace"
            data-key="Backspace"
            aria-label="backspace"
          >
            Back
          </button>
        </div>
        <div className="grid flex-1 grid-cols-4 gap-2 sm:gap-3" aria-label="calculator keypad">
          {keypadRows.map((row, rowIndex) =>
            row.map((btn, columnIndex) => (
              <button
                key={`${rowIndex}-${columnIndex}`}
                className={`${keypadBtnCls} ${btn.extraClassName ?? ''}`.trim()}
                {...(btn.value ? { 'data-value': btn.value } : {})}
                {...(btn.action ? { 'data-action': btn.action } : {})}
                {...(btn.keyBinding ? { 'data-key': btn.keyBinding } : {})}
                aria-label={btn.ariaLabel}
              >
                {btn.label}
              </button>
            )),
          )}
        </div>
        <button
          className={`${baseBtnCls} h-full min-h-[7.5rem] rounded-2xl bg-kali-control text-3xl font-bold text-kali-text shadow-lg shadow-[0_12px_30px_color-mix(in_srgb,var(--color-control-accent)_45%,transparent)] transition hover:brightness-110`}
          data-action="equals"
          data-key="= Enter"
          aria-label="equals"
        >
          =
        </button>
      </div>

      <div
        className="rounded-2xl border border-white/5 bg-kali-dark p-4 text-xs text-kali-text/70 shadow-inner"
        role="status"
        aria-live="polite"
        data-testid="calc-status-summary"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="uppercase tracking-[0.3em] text-kali-text/50">Mode</span>
          <span className="font-semibold capitalize text-kali-text" data-testid="calc-mode-summary">
            {mode}
          </span>
          <span className="uppercase tracking-[0.3em] text-kali-text/50">Panels</span>
          <span className="font-semibold text-kali-text" data-testid="calc-active-panels">
            {activePanels.length > 0 ? activePanels.join(' · ') : 'None'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="calc-summary-history">
          <span className="uppercase tracking-[0.3em] text-kali-text/50">Recent</span>
          {recentHistory.length === 0 ? (
            <span className="text-kali-text/50">No tape entries yet</span>
          ) : (
            recentHistory.map((entry, index) => (
              <Fragment key={`${entry.expr}-${entry.result}-${index}`}>
                {index > 0 && (
                  <span aria-hidden="true" className="text-kali-text/40">
                    •
                  </span>
                )}
                <span className="font-mono text-kali-text/90">
                  {entry.expr} = <span className="text-kali-control">{entry.result}</span>
                </span>
              </Fragment>
            ))
          )}
        </div>
      </div>

      <div id="scientific" className="scientific hidden grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm uppercase tracking-wide text-slate-200" aria-label="scientific functions">
        <button className={keypadBtnCls} data-value="sin(" aria-label="sine">
          sin
        </button>
        <button className={keypadBtnCls} data-value="cos(" aria-label="cosine">
          cos
        </button>
        <button className={keypadBtnCls} data-value="tan(" aria-label="tangent">
          tan
        </button>
        <button className={keypadBtnCls} data-value="sqrt(" aria-label="square root">
          √
        </button>
        <button className={keypadBtnCls} data-value="(" data-key="(" aria-label="left parenthesis">
          (
        </button>
        <button className={keypadBtnCls} data-value=")" data-key=")" aria-label="right parenthesis">
          )
        </button>
      </div>

      <div id="programmer" className="programmer hidden grid gap-2 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm uppercase tracking-wide text-slate-200" aria-label="programmer functions">
        <label className="text-xs font-semibold text-slate-400" htmlFor="base-select">
          Number base
        </label>
        <select
          id="base-select"
          defaultValue="10"
          className="h-11 rounded-xl border border-white/10 bg-kali-dark px-3 text-sm font-medium text-kali-text focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control"
        >
          <option value="2">Binary</option>
          <option value="8">Octal</option>
          <option value="10">Decimal</option>
          <option value="16">Hex</option>
        </select>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button className={keypadBtnCls} data-value="&amp;" data-key="&amp;" aria-label="bitwise and">
            &amp;
          </button>
          <button className={keypadBtnCls} data-value="|" data-key="|" aria-label="bitwise or">
            |
          </button>
          <button className={keypadBtnCls} data-value="^" data-key="^" aria-label="bitwise xor">
            ^
          </button>
          <button className={keypadBtnCls} data-value="~" data-key="~" aria-label="bitwise not">
            ~
          </button>
          <button className={keypadBtnCls} data-value="<<" data-key="&lt;" aria-label="left shift">
            &lt;&lt;
          </button>
          <button className={keypadBtnCls} data-value=">>" data-key="&gt;" aria-label="right shift">
            &gt;&gt;
          </button>
        </div>
        <div className="flex gap-2 pt-2">
          <button className={keypadBtnCls} data-action="ans" aria-label="previous answer">
            Ans
          </button>
          <button id="print-tape" className={keypadBtnCls} data-action="print" aria-label="print tape">
            Print
          </button>
        </div>
        <div id="paren-indicator" className="mt-2 h-1 rounded-full bg-white/10" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div id="history" className="history hidden space-y-2 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-200" aria-live="polite">
            {history.length === 0 && (
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                No history yet
              </p>
            )}
            {history.map(({ expr, result }, i) => (
              <div key={i} className="history-entry flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2">
                <span className="font-mono text-sm text-slate-100">{expr}</span>
                <span className="font-semibold text-kali-control">{result}</span>
              </div>
            ))}
          </div>
          <Tape entries={history} />
        </div>
        <div className="space-y-4">
          <div className="memory-grid grid grid-cols-3 gap-2" aria-label="memory functions">
            <button className={keypadBtnCls} data-action="mplus" aria-label="add to memory">
              M+
            </button>
            <button className={keypadBtnCls} data-action="mminus" aria-label="subtract from memory">
              M−
            </button>
            <button className={keypadBtnCls} data-action="mr" aria-label="recall memory">
              MR
            </button>
          </div>
          <MemorySlots />
          <FormulaEditor />
        </div>
      </div>
    </div>
  );
}

