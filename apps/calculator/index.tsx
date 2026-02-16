'use client';
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ModeSwitcher, { type Mode } from './components/ModeSwitcher';
import MemorySlots from './components/MemorySlots';
import FormulaEditor from './components/FormulaEditor';
import Tape from './components/Tape';

export default function Calculator() {
  const HISTORY_LIMIT = 10;
  const [showShortcuts, setShowShortcuts] = usePersistentState<boolean>(
    'calc-show-shortcuts',
    () => true,
    (v): v is boolean => typeof v === 'boolean',
  );
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
  const [mode, setMode] = usePersistentState<Mode>(
    'calc-mode',
    () => 'basic',
    (v): v is Mode => v === 'basic' || v === 'scientific' || v === 'programmer',
  );
  const [scientificActive, setScientificActive] = useState(false);
  const [programmerActive, setProgrammerActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const historyRef = useRef(history);
  const modeRef = useRef(mode);
  const apiRef = useRef<{
    evaluate?: (expr: string) => string;
    memoryAdd?: (expr: string) => void;
    memorySubtract?: (expr: string) => void;
    memoryRecall?: () => string;
    formatBase?: (value: string) => string;
    getLastResult?: () => string;
    setBase?: (base: number) => void;
    setPreciseMode?: (on: boolean) => void;
    setProgrammerMode?: (on: boolean) => void;
  } | null>(null);
  const uiRef = useRef<{
    display: HTMLInputElement;
    scientificToggle?: HTMLButtonElement | null;
    programmerToggle?: HTMLButtonElement | null;
    scientificPanel?: HTMLElement | null;
    programmerPanel?: HTMLElement | null;
  } | null>(null);

  const baseBtnCls =
    'btn flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]';
  const keypadBtnCls =
    `${baseBtnCls} h-14 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-0 text-lg text-[color:var(--kali-text)] shadow-sm hover:-translate-y-0.5 hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,rgba(255,255,255,0.08))]`;
  const operatorBtnCls =
    'border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[color:color-mix(in_srgb,var(--color-accent)_92%,white)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_24%,transparent)] hover:text-[color:var(--color-accent)]';
  const pillUtilityBtnCls =
    `${baseBtnCls} h-11 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[var(--kali-overlay)] px-5 text-sm uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_85%,rgba(148,163,184,0.35))] shadow-none hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_82%,transparent)] hover:text-[color:var(--kali-text)]`;

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
    historyRef.current = history;
  }, [history]);

  const applyMode = useCallback((nextMode: Mode) => {
    const refs = uiRef.current;
    if (!refs) return;
    const isScientific = nextMode === 'scientific';
    const isProgrammer = nextMode === 'programmer';
    refs.scientificToggle?.setAttribute('aria-pressed', String(isScientific));
    refs.programmerToggle?.setAttribute('aria-pressed', String(isProgrammer));
    refs.scientificPanel?.classList.toggle('hidden', !isScientific);
    refs.programmerPanel?.classList.toggle('hidden', !isProgrammer);
    apiRef.current?.setProgrammerMode?.(isProgrammer);
    setScientificActive(isScientific);
    setProgrammerActive(isProgrammer);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
    applyMode(mode);
  }, [mode, applyMode]);

  useEffect(() => {
    let cleanup = () => {};
    let disposed = false;

    const load = async () => {
      const mod = await import('./main');
      const api = (mod as any).default ?? mod;
      if (disposed) return;
      apiRef.current = {
        evaluate: api.evaluate,
        memoryAdd: api.memoryAdd,
        memorySubtract: api.memorySubtract,
        memoryRecall: api.memoryRecall,
        formatBase: api.formatBase,
        getLastResult: api.getLastResult,
        setBase: api.setBase,
        setPreciseMode: api.setPreciseMode,
        setProgrammerMode: api.setProgrammerMode,
      };

      const display = document.getElementById('display') as HTMLInputElement | null;
      if (!display) return;
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
      const parenIndicator = document.getElementById('paren-indicator');
      const allButtons = document.querySelectorAll<HTMLButtonElement>('.calculator button');

      uiRef.current = {
        display,
        scientificToggle,
        programmerToggle,
        scientificPanel,
        programmerPanel,
      };
      applyMode(modeRef.current);

      const handlers: Array<{
        element: HTMLElement | Document;
        type: keyof DocumentEventMap | keyof HTMLElementEventMap;
        handler: (event: any) => void;
      }> = [];
      const addListener = (
        element: HTMLElement | Document,
        type: keyof DocumentEventMap | keyof HTMLElementEventMap,
        handler: (event: any) => void,
      ) => {
        element.addEventListener(type, handler);
        handlers.push({ element, type, handler });
      };

      const clearError = () => {
        display.classList.remove('error');
      };

      const updateParenIndicator = () => {
        if (!parenIndicator) return;
        let balance = 0;
        for (const ch of display.value) {
          if (ch === '(') balance += 1;
          if (ch === ')') balance -= 1;
        }
        if (balance < 0) {
          display.classList.add('error');
          parenIndicator.style.background = 'rgba(248, 113, 113, 0.75)';
          parenIndicator.setAttribute('aria-label', 'Mismatched parentheses');
        } else if (balance > 0) {
          display.classList.remove('error');
          parenIndicator.style.background = 'color-mix(in srgb, var(--color-accent) 65%, transparent)';
          parenIndicator.setAttribute('aria-label', `${balance} open parenthesis${balance === 1 ? '' : 'es'}`);
        } else {
          display.classList.remove('error');
          parenIndicator.style.background = '';
          parenIndicator.setAttribute('aria-label', 'Parentheses balanced');
        }
      };

      const insertAtCursor = (text: string) => {
        clearError();
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        const before = display.value.slice(0, start);
        const after = display.value.slice(end);
        display.value = before + text + after;
        const pos = start + text.length;
        display.selectionStart = display.selectionEnd = pos;
        updateParenIndicator();
      };

      const toggleSection = (toggle: HTMLElement | null, section: HTMLElement | null) => {
        if (!section) return;
        const willShow = section.classList.contains('hidden');
        section.classList.toggle('hidden');
        toggle?.setAttribute('aria-pressed', String(willShow));
      };

      allButtons.forEach((btn) => {
        addListener(btn, 'mousedown', (event) => event.preventDefault());
      });

      buttons.forEach((btn) => {
        const handler = () => {
          const action = btn.dataset.action;
          const value = btn.dataset.value || btn.textContent || '';

          if (action === 'clear') {
            clearError();
            display.value = '';
            updateParenIndicator();
            return;
          }

          if (action === 'backspace') {
            clearError();
            display.value = display.value.slice(0, -1);
            updateParenIndicator();
            return;
          }

          if (action === 'equals') {
            const expr = display.value;
            try {
              const result = apiRef.current?.evaluate?.(expr);
              if (result === undefined) return;
              setHistory((prev) =>
                [{ expr, result }, ...prev].slice(0, HISTORY_LIMIT),
              );
              display.value = result;
              clearError();
              updateParenIndicator();
            } catch (e: any) {
              const idx = e.index || 0;
              display.classList.add('error');
              display.focus();
              display.setSelectionRange(idx, idx + 1);
            }
            return;
          }

          if (action === 'ans') {
            const last = apiRef.current?.getLastResult?.();
            const formatted = apiRef.current?.formatBase?.(last ?? '');
            if (formatted) {
              insertAtCursor(formatted);
            }
            return;
          }

          if (action === 'mplus') {
            apiRef.current?.memoryAdd?.(display.value);
            return;
          }

          if (action === 'mminus') {
            apiRef.current?.memorySubtract?.(display.value);
            return;
          }

          if (action === 'mr') {
            const result = apiRef.current?.memoryRecall?.();
            if (result !== undefined) {
              clearError();
              display.value = apiRef.current?.formatBase?.(result) ?? result;
              updateParenIndicator();
            }
            return;
          }

          if (action === 'print') {
            const entries = historyRef.current;
            const content =
              entries.length === 0
                ? 'Tape is empty.'
                : entries
                    .map(({ expr: entryExpr, result }, index) => `${index + 1}. ${entryExpr} = ${result}`)
                    .join('\n');
            const escapeHtml = (value: string) =>
              value.replace(/[&<>"']/g, (char) => {
                const map: Record<string, string> = {
                  '&': '&amp;',
                  '<': '&lt;',
                  '>': '&gt;',
                  '"': '&quot;',
                  "'": '&#39;',
                };
                return map[char] ?? char;
              });
            const printWindow = window.open('', 'calc-print', 'width=480,height=640');
            if (printWindow) {
              printWindow.document.write(`<pre>${escapeHtml(content)}</pre>`);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              setStatusMessage('Print dialog opened.');
            } else if (navigator.clipboard) {
              navigator.clipboard
                .writeText(content)
                .then(() => setStatusMessage('Tape copied to clipboard.'))
                .catch(() => setStatusMessage('Unable to print or copy tape.'));
            } else {
              setStatusMessage('Unable to print or copy tape.');
            }
            return;
          }

          insertAtCursor(value);
          display.focus();
        };
        addListener(btn, 'click', handler);
      });

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          return;
        }
        if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          (document.querySelector('.btn[data-action="equals"]') as HTMLButtonElement)?.click();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          clearError();
          display.value = display.value.slice(0, -1);
          updateParenIndicator();
          return;
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          clearError();
          display.value = '';
          updateParenIndicator();
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
      addListener(document, 'keydown', keyHandler);

      addListener(display, 'input', updateParenIndicator);

      if (historyToggle) {
        addListener(historyToggle as HTMLElement, 'click', () => {
          toggleSection(historyToggle, historyEl as HTMLElement | null);
        });
      }
      if (formulasToggle) {
        addListener(formulasToggle as HTMLElement, 'click', () => {
          toggleSection(formulasToggle, formulasEl as HTMLElement | null);
        });
      }

      if (historyToggle && historyEl) {
        historyToggle.setAttribute('aria-pressed', String(!historyEl.classList.contains('hidden')));
      }
      if (formulasToggle && formulasEl) {
        formulasToggle.setAttribute('aria-pressed', String(!formulasEl.classList.contains('hidden')));
      }

      if (baseSelect) {
        addListener(baseSelect, 'change', () => {
          apiRef.current?.setBase?.(parseInt(baseSelect.value, 10));
        });
      }

      if (preciseToggle) {
        let preciseOn = preciseToggle.getAttribute('aria-pressed') === 'true';
        const handlePrecise = () => {
          preciseOn = !preciseOn;
          preciseToggle.setAttribute('aria-pressed', String(preciseOn));
          apiRef.current?.setPreciseMode?.(preciseOn);
          setStatusMessage(preciseOn ? 'Precise mode enabled.' : 'Precise mode disabled.');
        };
        addListener(preciseToggle, 'click', handlePrecise);
      }

      if (scientificToggle) {
        const handleScientific = () => {
          setMode((prevMode) => (prevMode === 'scientific' ? 'basic' : 'scientific'));
        };
        addListener(scientificToggle, 'click', handleScientific);
      }

      if (programmerToggle) {
        const handleProgrammer = () => {
          setMode((prevMode) => (prevMode === 'programmer' ? 'basic' : 'programmer'));
        };
        addListener(programmerToggle, 'click', handleProgrammer);
      }

      updateParenIndicator();

      cleanup = () => {
        handlers.forEach(({ element, type, handler }) =>
          element.removeEventListener(type, handler),
        );
      };
    };

    load();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [applyMode, setHistory, setMode, setShowShortcuts]);

  const loadHistoryExpression = useCallback(
    (expr: string) => {
      const display = document.getElementById('display') as HTMLInputElement | null;
      if (!display) return;
      display.value = expr;
      display.dispatchEvent(new Event('input', { bubbles: true }));
      display.focus();
      setStatusMessage(`Loaded "${expr}" from tape.`);
    },
    [setStatusMessage],
  );

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
    <div className="calculator mx-auto flex w-full max-w-lg flex-col gap-6 rounded-3xl border border-[color:color-mix(in_srgb,var(--kali-border)_55%,transparent)] bg-[var(--kali-panel)] p-6 text-[color:var(--kali-text)] shadow-[0_35px_80px_-30px_rgba(15,15,20,0.9)]">
      <header className="flex items-center justify-between text-sm text-[color:color-mix(in_srgb,var(--kali-text)_82%,rgba(148,163,184,0.35))]">
        <button
          type="button"
          onClick={() => {
            const display = document.getElementById('display') as HTMLInputElement | null;
            if (display) {
              display.value = display.value.slice(0, -1);
              display.dispatchEvent(new Event('input', { bubbles: true }));
              display.focus();
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_60%,transparent)] bg-[var(--kali-overlay)] px-4 py-2 text-sm font-medium text-[color:color-mix(in_srgb,var(--kali-text)_88%,rgba(148,163,184,0.35))] transition hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_78%,transparent)] hover:text-[color:var(--kali-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
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
          <ModeSwitcher mode={mode} onChange={(nextMode) => setMode(nextMode)} />
          <div className="flex items-center gap-2 text-[color:color-mix(in_srgb,var(--kali-text)_65%,rgba(148,163,184,0.55))]">
            <button
              id="toggle-history"
              className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_45%,transparent)] bg-[var(--kali-overlay)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_72%,rgba(148,163,184,0.4))] transition hover:border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_78%,transparent)] hover:text-[color:var(--kali-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
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
              className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_45%,transparent)] bg-[var(--kali-overlay)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_72%,rgba(148,163,184,0.4))] transition hover:border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_78%,transparent)] hover:text-[color:var(--kali-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
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

      <div className="space-y-3 rounded-2xl border border-[color:var(--kali-border)] bg-[color:var(--color-dark)] p-4 shadow-inner">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">
          <span>Expression</span>
          <span>Result</span>
        </div>
        <label htmlFor="display" className="sr-only" id="calculator-display-label">
          Calculator display
        </label>
        <input
          id="display"
          className="display w-full rounded-2xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-dark)_92%,transparent)] px-4 py-4 text-right text-3xl font-semibold tracking-tight text-[color:var(--kali-text)] shadow-inner placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_48%,rgba(148,163,184,0.75))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
          placeholder="0"
          aria-labelledby="calculator-display-label"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,rgba(148,163,184,0.4))]">
        <button
          id="toggle-precise"
          className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_60%,transparent)] bg-[var(--kali-overlay)] px-3 py-1.5 transition hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_80%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
          aria-pressed="false"
          aria-label="toggle precise mode"
        >
          Precise
        </button>
        <button
          id="toggle-scientific"
          className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_60%,transparent)] bg-[var(--kali-overlay)] px-3 py-1.5 transition hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_80%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
          aria-pressed="false"
          aria-label="toggle scientific mode"
        >
          Scientific
        </button>
        <button
          id="toggle-programmer"
          className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_60%,transparent)] bg-[var(--kali-overlay)] px-3 py-1.5 transition hover:bg-[color:color-mix(in_srgb,var(--kali-overlay)_80%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
          aria-pressed="false"
          aria-label="toggle programmer mode"
        >
          Programmer
        </button>
      </div>

      <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-border)_55%,transparent)] bg-[var(--kali-overlay)] p-3 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_82%,rgba(148,163,184,0.35))]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">
            Keyboard shortcuts
          </span>
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="rounded-full border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] px-3 py-1 font-semibold uppercase tracking-wide transition hover:border-[color:var(--color-focus-ring)] hover:text-[color:var(--kali-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            aria-expanded={showShortcuts}
            aria-controls="calculator-shortcuts"
          >
            {showShortcuts ? 'Hide' : 'Show'}
          </button>
        </div>
        {showShortcuts && (
          <div id="calculator-shortcuts" className="mt-3 grid gap-2 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-[color:var(--kali-text)]">Enter / =</span> Evaluate expression
            </p>
            <p>
              <span className="font-semibold text-[color:var(--kali-text)]">Backspace</span> Delete previous character
            </p>
            <p>
              <span className="font-semibold text-[color:var(--kali-text)]">Esc / C</span> Clear display
            </p>
            <p>
              <span className="font-semibold text-[color:var(--kali-text)]">?</span> Toggle this panel
            </p>
          </div>
        )}
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
          className={`${baseBtnCls} h-full min-h-[7.5rem] rounded-2xl bg-kali-accent text-3xl font-bold text-kali-inverse shadow-lg shadow-[0_12px_30px_color-mix(in_srgb,_var(--color-accent),_transparent_55%)] transition hover:brightness-110`}
          data-action="equals"
          data-key="= Enter"
          aria-label="equals"
        >
          =
        </button>
      </div>

      <div
        className="rounded-2xl border border-[color:var(--kali-border)] bg-[color:var(--color-dark)] p-4 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_78%,rgba(148,163,184,0.42))] shadow-inner"
        role="status"
        aria-live="polite"
        data-testid="calc-status-summary"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">Mode</span>
          <span className="font-semibold capitalize text-[color:color-mix(in_srgb,var(--kali-text)_92%,rgba(148,163,184,0.15))]" data-testid="calc-mode-summary">
            {mode}
          </span>
          <span className="uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">Panels</span>
          <span className="font-semibold text-[color:color-mix(in_srgb,var(--kali-text)_92%,rgba(148,163,184,0.15))]" data-testid="calc-active-panels">
            {activePanels.length > 0 ? activePanels.join(' · ') : 'None'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="calc-summary-history">
          <span className="uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">Recent</span>
          {recentHistory.length === 0 ? (
            <span className="text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">No tape entries yet</span>
          ) : (
            recentHistory.map((entry, index) => (
              <Fragment key={`${entry.expr}-${entry.result}-${index}`}>
                {index > 0 && (
                  <span aria-hidden="true" className="text-[color:color-mix(in_srgb,var(--kali-text)_48%,rgba(148,163,184,0.75))]">
                    •
                  </span>
                )}
                <span className="font-mono text-[color:color-mix(in_srgb,var(--kali-text)_90%,rgba(148,163,184,0.2))]">
                  {entry.expr} = <span className="text-kali-accent">{entry.result}</span>
                </span>
              </Fragment>
            ))
          )}
        </div>
        {statusMessage && (
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_75%,rgba(148,163,184,0.35))]" data-testid="calc-status-message">
            {statusMessage}
          </div>
        )}
      </div>

      <div id="scientific" className="scientific hidden grid grid-cols-3 gap-2 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-4 text-sm uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_88%,rgba(148,163,184,0.2))]" aria-label="scientific functions">
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

      <div id="programmer" className="programmer hidden grid gap-2 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-4 text-sm uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_88%,rgba(148,163,184,0.2))]" aria-label="programmer functions">
        <label className="text-xs font-semibold text-[color:color-mix(in_srgb,var(--kali-text)_72%,rgba(148,163,184,0.35))]" htmlFor="base-select">
          Number base
        </label>
        <select
          id="base-select"
          defaultValue="10"
          className="h-11 rounded-xl border border-[color:color-mix(in_srgb,var(--kali-border)_60%,transparent)] bg-[color:var(--color-dark)] px-3 text-sm font-medium text-[color:var(--kali-text)] focus:border-[color:var(--color-focus-ring)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-focus-ring)]"
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
        <div
          id="paren-indicator"
          className="mt-2 h-1 rounded-full bg-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)]"
          role="status"
          aria-live="polite"
          aria-label="Parentheses balanced"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div id="history" className="history hidden space-y-2 rounded-2xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-4 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_90%,rgba(148,163,184,0.18))]" aria-live="polite">
            {history.length === 0 && (
              <p className="text-xs uppercase tracking-[0.3em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,rgba(148,163,184,0.65))]">
                No history yet
              </p>
            )}
            {history.map(({ expr, result }, i) => (
              <button
                key={i}
                type="button"
                className="history-entry flex w-full items-center justify-between gap-2 rounded-xl bg-[color:color-mix(in_srgb,var(--kali-bg)_35%,transparent)] px-3 py-2 text-left transition hover:bg-[color:color-mix(in_srgb,var(--kali-bg)_55%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
                onClick={() => loadHistoryExpression(expr)}
                aria-label={`load ${expr} from history`}
              >
                <span className="font-mono text-sm text-[color:color-mix(in_srgb,var(--kali-text)_92%,rgba(148,163,184,0.15))]">{expr}</span>
                <span className="font-semibold text-kali-accent">{result}</span>
              </button>
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
