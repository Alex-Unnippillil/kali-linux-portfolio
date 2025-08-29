'use client';
import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ModeSwitcher from './components/ModeSwitcher';
import './styles.css';
import MemorySlots from './components/MemorySlots';

export default function Calculator() {
  const [tape, setTape] = usePersistentState<{expr: string; result: string}[]>('calc-tape', () => [], (v): v is {expr: string; result: string}[] => Array.isArray(v) && v.every(item => typeof item?.expr === 'string' && typeof item?.result === 'string'));

  const btnCls =
    'btn h-12 w-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white';

  useEffect(() => {
    const handler = (e: any) => {
      setTape(prev => [e.detail, ...prev].slice(0,10));
    };
    document.addEventListener('tape-add', handler);
    return () => document.removeEventListener('tape-add', handler);
  }, [setTape]);

  useEffect(() => {
    const load = async () => {
      if (typeof window !== 'undefined' && !(window as any).math) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mathjs@13.2.3/lib/browser/math.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }
      await import('./main');
    };
    load();

    const display = document.getElementById('display') as HTMLInputElement | null;
    const handleError = (e: any) => {
      if (!display) return;
      const idx = e.detail.index || 0;
      display.classList.add('error');
      display.focus();
      display.setSelectionRange(idx, idx + 1);
    };
    const clearError = () => display?.classList.remove('error');
    document.addEventListener('parse-error', handleError);
    document.addEventListener('clear-error', clearError);
    display?.addEventListener('input', clearError);
    return () => {
      document.removeEventListener('parse-error', handleError);
      document.removeEventListener('clear-error', clearError);
      display?.removeEventListener('input', clearError);
    };
  }, []);

    return (
    <div className="calculator !bg-[var(--kali-bg)]">
      <ModeSwitcher />
            <input id="display" className="display h-12" />
      <button id="toggle-precise" className="toggle h-12" aria-pressed="false" aria-label="toggle precise mode">Precise Mode: Off</button>
      <button id="toggle-scientific" className="toggle h-12" aria-pressed="false" aria-label="toggle scientific mode">Scientific</button>
      <button id="toggle-programmer" className="toggle h-12" aria-pressed="false" aria-label="toggle programmer mode">Programmer</button>
      <button id="toggle-history" className="toggle h-12" aria-pressed="false" aria-label="toggle history">History</button>
      <div className="memory-grid grid grid-cols-3 !gap-1" aria-label="memory functions">
        <button className={btnCls} data-action="mplus" aria-label="add to memory">M+</button>
        <button className={btnCls} data-action="mminus" aria-label="subtract from memory">M&minus;</button>
        <button className={btnCls} data-action="mr" aria-label="recall memory">MR</button>
      </div>
      <MemorySlots />
      <div className="button-grid grid grid-cols-4 !gap-1" aria-label="calculator keypad">
        <button className={btnCls} data-value="7" data-key="7" aria-label="seven">7</button>
        <button className={btnCls} data-value="8" data-key="8" aria-label="eight">8</button>
        <button className={btnCls} data-value="9" data-key="9" aria-label="nine">9</button>
        <button className={btnCls} data-value="/" data-key="/" aria-label="divide">&divide;</button>
        <button className={btnCls} data-value="4" data-key="4" aria-label="four">4</button>
        <button className={btnCls} data-value="5" data-key="5" aria-label="five">5</button>
        <button className={btnCls} data-value="6" data-key="6" aria-label="six">6</button>
        <button className={btnCls} data-value="*" data-key="*" aria-label="multiply">&times;</button>
        <button className={btnCls} data-value="1" data-key="1" aria-label="one">1</button>
        <button className={btnCls} data-value="2" data-key="2" aria-label="two">2</button>
        <button className={btnCls} data-value="3" data-key="3" aria-label="three">3</button>
        <button className={btnCls} data-value="-" data-key="-" aria-label="subtract">&minus;</button>
        <button className={btnCls} data-value="0" data-key="0" aria-label="zero">0</button>
        <button className={btnCls} data-value="." data-key="." aria-label="decimal point">.</button>
        <button className={btnCls} data-action="equals" data-key="= Enter" aria-label="equals">=</button>
        <button className={btnCls} data-value="+" data-key="+" aria-label="add">+</button>
        <button className={`${btnCls} span-two w-full`} data-action="clear" data-key="Escape c" aria-label="clear">C</button>
        <button className={`${btnCls} span-two w-full`} data-action="backspace" data-key="Backspace" aria-label="backspace">⌫</button>
      </div>
      <div id="scientific" className="scientific hidden grid grid-cols-3 !gap-1" aria-label="scientific functions">
        <button className={btnCls} data-value="sin(" aria-label="sine">sin</button>
        <button className={btnCls} data-value="cos(" aria-label="cosine">cos</button>
        <button className={btnCls} data-value="tan(" aria-label="tangent">tan</button>
        <button className={btnCls} data-value="sqrt(" aria-label="square root">√</button>
        <button className={btnCls} data-value="(" data-key="(" aria-label="left parenthesis">(</button>
        <button className={btnCls} data-value=")" data-key=")" aria-label="right parenthesis">)</button>
      </div>
      <div id="programmer" className="programmer hidden grid !gap-1" aria-label="programmer functions">
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
      <div id="history" className="history hidden" aria-live="polite" />
    </div>
  );
}

