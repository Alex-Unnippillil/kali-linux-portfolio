'use client';
import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ModeSwitcher, { type Mode } from './components/ModeSwitcher';
import MemorySlots from './components/MemorySlots';
import FormulaEditor from './components/FormulaEditor';
import Tape from './components/Tape';

const PROGRAMMER_BASES = [
  { base: 16, label: 'HEX', key: 'hex' },
  { base: 10, label: 'DEC', key: 'dec' },
  { base: 8, label: 'OCT', key: 'oct' },
  { base: 2, label: 'BIN', key: 'bin' },
] as const;

type ProgrammerBaseKey = (typeof PROGRAMMER_BASES)[number]['key'];
type SupportedBase = (typeof PROGRAMMER_BASES)[number]['base'];

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
    'btn min-h-12 w-12 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white';

  useEffect(() => {
    let evaluate: any;
    let memoryAdd: any;
    let memorySubtract: any;
    let memoryRecall: any;
    let formatBase: any;
    let getLastResult: any;
    let setBase: any;
    let convertBase: any;
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
      convertBase = mod.convertBase;
      setPreciseMode = mod.setPreciseMode;
      setProgrammerMode = mod.setProgrammerMode;

      const display = document.getElementById('display') as HTMLInputElement | null;
      if (!display) return;

      const buttons = document.querySelectorAll<HTMLButtonElement>('.btn');
      const historyToggle = document.getElementById('toggle-history');
      const historyEl = document.getElementById('history');
      const formulasToggle = document.getElementById('toggle-formulas');
      const formulasEl = document.getElementById('formulas');
      const baseSelect = document.getElementById('base-select') as HTMLSelectElement | null;
      const preciseToggle = document.getElementById(
        'toggle-precise',
      ) as HTMLButtonElement | null;
      const scientificToggle = document.getElementById(
        'toggle-scientific',
      ) as HTMLButtonElement | null;
      const programmerToggle = document.getElementById(
        'toggle-programmer',
      ) as HTMLButtonElement | null;
      const programmerEl = document.getElementById('programmer');
      const scientificEl = document.getElementById('scientific');

      const handlers: Array<{ btn: HTMLButtonElement; handler: () => void }> = [];
      const eventCleanups: Array<() => void> = [];
      const copyResetTimers = new Map<HTMLButtonElement, number>();

      const outputs = new Map<SupportedBase, HTMLElement>();
      const copyButtons = new Map<SupportedBase, HTMLButtonElement>();
      PROGRAMMER_BASES.forEach(({ base }) => {
        const output = programmerEl?.querySelector<HTMLElement>(
          `[data-base-value="${base}"]`,
        );
        if (output) outputs.set(base, output);
        const copyBtn = programmerEl?.querySelector<HTMLButtonElement>(
          `[data-copy-base="${base}"]`,
        );
        if (copyBtn) {
          copyBtn.dataset.originalLabel = copyBtn.textContent?.trim() || 'Copy';
          copyButtons.set(base, copyBtn);
        }
      });

      const regexByBase: Record<SupportedBase, RegExp> = {
        2: /^[-+]?[01]+$/,
        8: /^[-+]?[0-7]+$/,
        10: /^[-+]?\d+$/,
        16: /^[-+]?[0-9a-f]+$/i,
      };

      const prefixByBase: Partial<Record<SupportedBase, RegExp>> = {
        2: /^0b/i,
        8: /^0o/i,
        16: /^0x/i,
      };

      let currentConversions: Partial<Record<ProgrammerBaseKey, string>> = {};

      const isSupportedBase = (value: number): value is SupportedBase =>
        PROGRAMMER_BASES.some(({ base }) => base === value);

      const setCopyButtonsDisabled = (disabled: boolean) => {
        copyButtons.forEach((btn) => {
          btn.disabled = disabled;
          btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
          if (disabled) {
            const resetId = copyResetTimers.get(btn);
            if (typeof resetId === 'number') {
              window.clearTimeout(resetId);
              copyResetTimers.delete(btn);
            }
            btn.textContent = btn.dataset.originalLabel || 'Copy';
          }
        });
      };

      const updateProgrammerReadouts = () => {
        if (!convertBase) return;
        const parsedBase = parseInt(baseSelect?.value ?? '10', 10);
        const base: SupportedBase = isSupportedBase(parsedBase)
          ? parsedBase
          : 10;
        const regex = regexByBase[base];
        const rawValue = display.value.trim();
        const sign = rawValue.startsWith('-') || rawValue.startsWith('+')
          ? rawValue[0]
          : '';
        const remainder = rawValue.slice(sign ? 1 : 0);
        const prefix = prefixByBase[base];
        const withoutPrefix = prefix && prefix.test(remainder)
          ? remainder.replace(prefix, '')
          : remainder;
        const candidate = `${sign}${withoutPrefix}`;
        const normalized =
          candidate === '' || candidate === sign ? `${sign}0` : candidate;

        if (!regex || !regex.test(normalized)) {
          currentConversions = {};
          outputs.forEach((output) => {
            output.textContent = '—';
            output.setAttribute('data-copy-value', '');
          });
          setCopyButtonsDisabled(true);
          return;
        }

        const conversions = {} as Record<ProgrammerBaseKey, string>;
        PROGRAMMER_BASES.forEach(({ base: targetBase, key }) => {
          let converted = convertBase(normalized, base, targetBase);
          if (targetBase !== 10) converted = converted.toUpperCase();
          conversions[key] = converted;
          const output = outputs.get(targetBase);
          if (output) {
            output.textContent = converted;
            output.setAttribute('data-copy-value', converted);
          }
        });
        currentConversions = conversions;
        setCopyButtonsDisabled(false);
      };

      const emitDisplayUpdate = () => {
        display.classList.remove('error');
        updateProgrammerReadouts();
      };

      display.addEventListener('input', emitDisplayUpdate);
      eventCleanups.push(() => display.removeEventListener('input', emitDisplayUpdate));

      const insertAtCursor = (text: string) => {
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        const before = display.value.slice(0, start);
        const after = display.value.slice(end);
        display.value = before + text + after;
        const pos = start + text.length;
        display.selectionStart = display.selectionEnd = pos;
        display.focus();
        emitDisplayUpdate();
      };

      const handleCopyClick = async (event: Event) => {
        const btn = event.currentTarget as HTMLButtonElement | null;
        if (!btn) return;
        const base = Number(btn.dataset.copyBase);
        const config = PROGRAMMER_BASES.find((item) => item.base === base);
        if (!config) return;
        const value = currentConversions[config.key];
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          const original = btn.dataset.originalLabel || 'Copy';
          btn.textContent = 'Copied';
          const timeoutId = window.setTimeout(() => {
            btn.textContent = original;
            copyResetTimers.delete(btn);
          }, 1200);
          const previous = copyResetTimers.get(btn);
          if (typeof previous === 'number') window.clearTimeout(previous);
          copyResetTimers.set(btn, timeoutId);
        } catch {
          // ignore clipboard errors
        }
      };

      copyButtons.forEach((btn) => {
        btn.addEventListener('click', handleCopyClick);
        eventCleanups.push(() => btn.removeEventListener('click', handleCopyClick));
      });

      setCopyButtonsDisabled(true);

      buttons.forEach((btn) => {
        const handler = () => {
          const action = btn.dataset.action;
          const value = btn.dataset.value || btn.textContent || '';

          if (action === 'clear') {
            display.value = '';
            emitDisplayUpdate();
            return;
          }

          if (action === 'backspace') {
            display.value = display.value.slice(0, -1);
            emitDisplayUpdate();
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
              emitDisplayUpdate();
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
            emitDisplayUpdate();
            return;
          }

          insertAtCursor(value);
        };
        btn.addEventListener('click', handler);
        handlers.push({ btn, handler });
      });

      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          (document.querySelector(
            '.btn[data-action="equals"]',
          ) as HTMLButtonElement)?.click();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          display.value = display.value.slice(0, -1);
          emitDisplayUpdate();
          return;
        }
        if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          display.value = '';
          emitDisplayUpdate();
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

      const historyClick = () => {
        historyEl?.classList.toggle('hidden');
      };
      historyToggle?.addEventListener('click', historyClick);
      if (historyToggle)
        eventCleanups.push(() => historyToggle.removeEventListener('click', historyClick));

      const formulasClick = () => {
        formulasEl?.classList.toggle('hidden');
      };
      formulasToggle?.addEventListener('click', formulasClick);
      if (formulasToggle)
        eventCleanups.push(() => formulasToggle.removeEventListener('click', formulasClick));

      if (baseSelect) {
        const handleBaseChange = () => {
          setBase(parseInt(baseSelect.value, 10));
          emitDisplayUpdate();
        };
        baseSelect.addEventListener('change', handleBaseChange);
        eventCleanups.push(() =>
          baseSelect.removeEventListener('change', handleBaseChange),
        );
      }

      if (preciseToggle) {
        const handlePreciseToggle = () => {
          const next = preciseToggle.getAttribute('aria-pressed') !== 'true';
          preciseToggle.setAttribute('aria-pressed', String(next));
          preciseToggle.textContent = `Precise Mode: ${next ? 'On' : 'Off'}`;
          setPreciseMode?.(next);
        };
        preciseToggle.addEventListener('click', handlePreciseToggle);
        eventCleanups.push(() =>
          preciseToggle.removeEventListener('click', handlePreciseToggle),
        );
      }

      const dispatchMode = (mode: Mode) => {
        document.dispatchEvent(new CustomEvent<Mode>('mode-change', { detail: mode }));
      };

      if (scientificToggle) {
        const handleScientificToggle = () => {
          const active = scientificToggle.getAttribute('aria-pressed') === 'true';
          dispatchMode(active ? 'basic' : 'scientific');
        };
        scientificToggle.addEventListener('click', handleScientificToggle);
        eventCleanups.push(() =>
          scientificToggle.removeEventListener('click', handleScientificToggle),
        );
      }

      if (programmerToggle) {
        const handleProgrammerToggle = () => {
          const active = programmerToggle.getAttribute('aria-pressed') === 'true';
          dispatchMode(active ? 'basic' : 'programmer');
        };
        programmerToggle.addEventListener('click', handleProgrammerToggle);
        eventCleanups.push(() =>
          programmerToggle.removeEventListener('click', handleProgrammerToggle),
        );
      }

      const applyMode = (mode: Mode) => {
        const isProgrammer = mode === 'programmer';
        const isScientific = mode === 'scientific';
        programmerEl?.classList.toggle('hidden', !isProgrammer);
        scientificEl?.classList.toggle('hidden', !isScientific);
        programmerToggle?.setAttribute('aria-pressed', String(isProgrammer));
        scientificToggle?.setAttribute('aria-pressed', String(isScientific));
        setProgrammerMode?.(isProgrammer);
        if (isProgrammer) {
          emitDisplayUpdate();
        }
      };

      const handleModeChange = (event: Event) => {
        const mode = (event as CustomEvent<Mode>).detail;
        if (!mode) return;
        applyMode(mode);
      };

      document.addEventListener('mode-change', handleModeChange);
      eventCleanups.push(() =>
        document.removeEventListener('mode-change', handleModeChange),
      );

      let storedMode: Mode = 'basic';
      try {
        const raw = window.localStorage.getItem('calc-mode');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed === 'scientific' || parsed === 'programmer') {
            storedMode = parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
      applyMode(storedMode);

      return () => {
        handlers.forEach(({ btn, handler }) =>
          btn.removeEventListener('click', handler),
        );
        document.removeEventListener('keydown', keyHandler);
        eventCleanups.forEach((fn) => fn());
        copyResetTimers.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    };

    load();
  }, [setHistory]);

  return (
    <div className="calculator !bg-[var(--kali-bg)]">
      <ModeSwitcher />
      <input id="display" className="display h-12" />
      <button
        id="toggle-precise"
        className="toggle h-12"
        aria-pressed="false"
        aria-label="toggle precise mode"
      >
        Precise Mode: Off
      </button>
      <button
        id="toggle-scientific"
        className="toggle h-12"
        aria-pressed="false"
        aria-label="toggle scientific mode"
      >
        Scientific
      </button>
      <button
        id="toggle-programmer"
        className="toggle h-12"
        aria-pressed="false"
        aria-label="toggle programmer mode"
      >
        Programmer
      </button>
      <button
        id="toggle-history"
        className="toggle h-12"
        aria-pressed="false"
        aria-label="toggle history"
      >
        History
      </button>
      <button
        id="toggle-formulas"
        className="toggle h-12"
        aria-pressed="false"
        aria-label="toggle formulas"
      >
        Formulas
      </button>
      <div className="memory-grid grid grid-cols-3" aria-label="memory functions">
        <button className={btnCls} data-action="mplus" aria-label="add to memory">
          M+
        </button>
        <button className={btnCls} data-action="mminus" aria-label="subtract from memory">
          M&minus;
        </button>
        <button className={btnCls} data-action="mr" aria-label="recall memory">
          MR
        </button>
      </div>
      <MemorySlots />
      <div className="button-grid grid grid-cols-4 font-mono" aria-label="calculator keypad">
        <button className={btnCls} data-value="7" data-key="7" aria-label="seven">
          7
        </button>
        <button className={btnCls} data-value="8" data-key="8" aria-label="eight">
          8
        </button>
        <button className={btnCls} data-value="9" data-key="9" aria-label="nine">
          9
        </button>
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
        <button className={btnCls} data-value="4" data-key="4" aria-label="four">
          4
        </button>
        <button className={btnCls} data-value="5" data-key="5" aria-label="five">
          5
        </button>
        <button className={btnCls} data-value="6" data-key="6" aria-label="six">
          6
        </button>
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
        <button className={btnCls} data-value="1" data-key="1" aria-label="one">
          1
        </button>
        <button className={btnCls} data-value="2" data-key="2" aria-label="two">
          2
        </button>
        <button className={btnCls} data-value="3" data-key="3" aria-label="three">
          3
        </button>
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
        <button className={btnCls} data-value="0" data-key="0" aria-label="zero">
          0
        </button>
        <button className={btnCls} data-value="." data-key="." aria-label="decimal point">
          .
        </button>
        <button className={btnCls} data-action="equals" data-key="= Enter" aria-label="equals">
          =
        </button>
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
        <button
          className={`${btnCls} span-two w-full`}
          data-action="clear"
          data-key="Escape c"
          aria-label="clear"
        >
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
        <button
          className={`${btnCls} span-two w-full`}
          data-action="backspace"
          data-key="Backspace"
          aria-label="backspace"
        >
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
      <div
        id="scientific"
        className="scientific hidden grid grid-cols-3 gap-1.5"
        aria-label="scientific functions"
      >
        <button className={btnCls} data-value="sin(" aria-label="sine">
          sin
        </button>
        <button className={btnCls} data-value="cos(" aria-label="cosine">
          cos
        </button>
        <button className={btnCls} data-value="tan(" aria-label="tangent">
          tan
        </button>
        <button className={btnCls} data-value="sqrt(" aria-label="square root">
          √
        </button>
        <button className={btnCls} data-value="(" data-key="(" aria-label="left parenthesis">
          (
        </button>
        <button className={btnCls} data-value=")" data-key=")" aria-label="right parenthesis">
          )
        </button>
      </div>
      <div
        id="programmer"
        className="programmer hidden grid gap-1.5"
        aria-label="programmer functions"
      >
        <select id="base-select" defaultValue="10" className="h-12 w-full">
          <option value="2">Bin</option>
          <option value="8">Oct</option>
          <option value="10">Dec</option>
          <option value="16">Hex</option>
        </select>
        <div className="grid grid-cols-3 gap-1.5">
          <button className={`${btnCls} w-full`} data-value="&amp;" data-key="&amp;" aria-label="bitwise and">
            &amp;
          </button>
          <button className={`${btnCls} w-full`} data-value="|" data-key="|" aria-label="bitwise or">
            |
          </button>
          <button className={`${btnCls} w-full`} data-value="^" data-key="^" aria-label="bitwise xor">
            ^
          </button>
          <button className={`${btnCls} w-full`} data-value="~" data-key="~" aria-label="bitwise not">
            ~
          </button>
          <button className={`${btnCls} w-full`} data-value="<<" data-key="&lt;" aria-label="left shift">
            &lt;&lt;
          </button>
          <button className={`${btnCls} w-full`} data-value=">>" data-key="&gt;" aria-label="right shift">
            &gt;&gt;
          </button>
        </div>
        <div className="grid gap-1.5" aria-label="base conversions">
          {PROGRAMMER_BASES.map(({ base, label }) => (
            <div
              key={base}
              className="flex items-center gap-1.5 rounded bg-black/30 px-2 py-1"
            >
              <span className="w-10 text-xs font-semibold uppercase tracking-wide">
                {label}
              </span>
              <output
                className="flex-1 overflow-x-auto text-right font-mono text-xs"
                data-base-value={base}
                aria-live="polite"
              >
                —
              </output>
              <button
                type="button"
                className="rounded bg-black/40 px-2 py-1 text-xs transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                data-copy-base={base}
                aria-label={`copy ${label.toLowerCase()} value`}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button className={`${btnCls} w-full`} data-action="ans" aria-label="previous answer">
            Ans
          </button>
          <button
            id="print-tape"
            className={`${btnCls} w-full`}
            data-action="print"
            aria-label="print tape"
          >
            Print
          </button>
        </div>
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

