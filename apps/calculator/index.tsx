'use client';
import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ModeSwitcher from './components/ModeSwitcher';
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

  const btnCls =
    'btn min-h-12 w-12 transition-transform duration-150 hover:-translate-y-0.5 focus-ring';

  useEffect(() => {
    let evaluate: any;
    let memoryAdd: any;
    let memorySubtract: any;
    let memoryRecall: any;
    let formatBase: any;
    let getLastResult: any;
    let setBase: any;

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

      const display = document.getElementById('display') as HTMLInputElement;
      const buttons = document.querySelectorAll<HTMLButtonElement>('.btn');
      const historyToggle = document.getElementById('toggle-history');
      const historyEl = document.getElementById('history');
      const formulasToggle = document.getElementById('toggle-formulas');
      const formulasEl = document.getElementById('formulas');
      const baseSelect = document.getElementById('base-select') as HTMLSelectElement | null;

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

      return () => {
        handlers.forEach(({ btn, handler }) =>
          btn.removeEventListener('click', handler),
        );
        document.removeEventListener('keydown', keyHandler);
      };
    };

    load();
  }, [setHistory]);

    return (
    <div className="calculator !bg-[var(--kali-bg)]">
      <ModeSwitcher />
            <input id="display" className="display h-12" />
      <button id="toggle-precise" className="toggle h-12" aria-pressed="false" aria-label="toggle precise mode">Precise Mode: Off</button>
      <button id="toggle-scientific" className="toggle h-12" aria-pressed="false" aria-label="toggle scientific mode">Scientific</button>
      <button id="toggle-programmer" className="toggle h-12" aria-pressed="false" aria-label="toggle programmer mode">Programmer</button>
      <button id="toggle-history" className="toggle h-12" aria-pressed="false" aria-label="toggle history">History</button>
      <button id="toggle-formulas" className="toggle h-12" aria-pressed="false" aria-label="toggle formulas">Formulas</button>
      <div className="memory-grid grid grid-cols-3" aria-label="memory functions">
        <button className={btnCls} data-action="mplus" aria-label="add to memory">M+</button>
        <button className={btnCls} data-action="mminus" aria-label="subtract from memory">M&minus;</button>
        <button className={btnCls} data-action="mr" aria-label="recall memory">MR</button>
      </div>
      <MemorySlots />
      <div className="button-grid grid grid-cols-4 font-mono" aria-label="calculator keypad">
        <button className={btnCls} data-value="7" data-key="7" aria-label="seven">7</button>
        <button className={btnCls} data-value="8" data-key="8" aria-label="eight">8</button>
        <button className={btnCls} data-value="9" data-key="9" aria-label="nine">9</button>
        <button className={btnCls} data-value="/" data-key="/" aria-label="divide">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <line x1="5" y1="12" x2="19" y2="12" />
            <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button className={btnCls} data-value="4" data-key="4" aria-label="four">4</button>
        <button className={btnCls} data-value="5" data-key="5" aria-label="five">5</button>
        <button className={btnCls} data-value="6" data-key="6" aria-label="six">6</button>
        <button className={btnCls} data-value="*" data-key="*" aria-label="multiply">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <button className={btnCls} data-value="1" data-key="1" aria-label="one">1</button>
        <button className={btnCls} data-value="2" data-key="2" aria-label="two">2</button>
        <button className={btnCls} data-value="3" data-key="3" aria-label="three">3</button>
        <button className={btnCls} data-value="-" data-key="-" aria-label="subtract">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className={btnCls} data-value="0" data-key="0" aria-label="zero">0</button>
        <button className={btnCls} data-value="." data-key="." aria-label="decimal point">.</button>
        <button className={btnCls} data-action="equals" data-key="= Enter" aria-label="equals">=</button>
        <button className={btnCls} data-value="+" data-key="+" aria-label="add">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      <button className={`${btnCls} span-two w-full`} data-action="clear" data-key="Escape c" aria-label="clear">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
      <button className={`${btnCls} span-two w-full`} data-action="backspace" data-key="Backspace" aria-label="backspace">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-8L7 12l5 7z" />
          <path d="M14 9l3 3-3 3" />
          <path d="M11 9l-3 3 3 3" />
        </svg>
      </button>
      </div>
        <div id="scientific" className="scientific hidden grid grid-cols-3 gap-1.5" aria-label="scientific functions">
        <button className={btnCls} data-value="sin(" aria-label="sine">sin</button>
        <button className={btnCls} data-value="cos(" aria-label="cosine">cos</button>
        <button className={btnCls} data-value="tan(" aria-label="tangent">tan</button>
        <button className={btnCls} data-value="sqrt(" aria-label="square root">√</button>
        <button className={btnCls} data-value="(" data-key="(" aria-label="left parenthesis">(</button>
        <button className={btnCls} data-value=")" data-key=")" aria-label="right parenthesis">)</button>
      </div>
        <div id="programmer" className="programmer hidden grid gap-1.5" aria-label="programmer functions">
        <select id="base-select" defaultValue="10" className="h-12">
          <option value="2">Bin</option>
          <option value="8">Oct</option>
          <option value="10">Dec</option>
          <option value="16">Hex</option>
        </select>
        <button className={btnCls} data-value="&amp;" data-key="&amp;" aria-label="bitwise and">&amp;</button>
        <button className={btnCls} data-value="|" data-key="|" aria-label="bitwise or">|</button>
        <button className={btnCls} data-value="^" data-key="^" aria-label="bitwise xor">^</button>
        <button className={btnCls} data-value="~" data-key="~" aria-label="bitwise not">~</button>
        <button className={btnCls} data-value="<<" data-key="&lt;" aria-label="left shift">&lt;&lt;</button>
        <button className={btnCls} data-value=">>" data-key="&gt;" aria-label="right shift">&gt;&gt;</button>
      <button className={btnCls} data-action="ans" aria-label="previous answer">Ans</button>
      <button id="print-tape" className={btnCls} data-action="print" aria-label="print tape">Print</button>
        <div id="paren-indicator" />
      </div>
      <FormulaEditor />
      <div id="history" className="history hidden" aria-live="polite">
        {history.map(({ expr, result }, i) => (
          <div key={i} className="history-entry">
            {expr} = {result}
          </div>
        ))}
      </div>
      <Tape entries={history} />
    </div>
  );
}

