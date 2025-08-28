'use client';
import { useEffect, useState } from 'react';
import FormField from '../../components/ui/FormField';
import './styles.css';

export default function Calculator() {
  const [error, setError] = useState('');

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
      const mod = await import('./main');
      if (mod.initCalculator) mod.initCalculator(setError);
    };
    load();
  }, []);

  return (
    <div className="calculator">
      <FormField error={error}>
        <input id="display" className="display" />
      </FormField>
      <button id="toggle-precise" className="toggle" aria-pressed="false">Precise Mode: Off</button>
      <button id="toggle-scientific" className="toggle" aria-pressed="false">Scientific</button>
      <button id="toggle-programmer" className="toggle" aria-pressed="false">Programmer</button>
      <button id="toggle-history" className="toggle" aria-pressed="false">History</button>
      <div className="buttons">
        <button className="btn" data-value="7">7</button>
        <button className="btn" data-value="8">8</button>
        <button className="btn" data-value="9">9</button>
        <button className="btn" data-value="/">&divide;</button>
        <button className="btn" data-value="4">4</button>
        <button className="btn" data-value="5">5</button>
        <button className="btn" data-value="6">6</button>
        <button className="btn" data-value="*">&times;</button>
        <button className="btn" data-value="1">1</button>
        <button className="btn" data-value="2">2</button>
        <button className="btn" data-value="3">3</button>
        <button className="btn" data-value="-">&minus;</button>
        <button className="btn" data-value="0">0</button>
        <button className="btn" data-value=".">.</button>
        <button className="btn" data-action="equals">=</button>
        <button className="btn" data-value="+">+</button>
        <button className="btn span-two" data-action="clear">C</button>
      </div>
      <div id="scientific" className="scientific hidden">
        <button className="btn" data-value="sin(">sin</button>
        <button className="btn" data-value="cos(">cos</button>
        <button className="btn" data-value="tan(">tan</button>
        <button className="btn" data-value="sqrt(">√</button>
        <button className="btn" data-value="(">(</button>
        <button className="btn" data-value=")">)</button>
      </div>
      <div id="programmer" className="programmer hidden">
        <select id="base-select" defaultValue="10">
          <option value="2">Bin</option>
          <option value="8">Oct</option>
          <option value="10">Dec</option>
          <option value="16">Hex</option>
        </select>
        <button className="btn" data-value="&amp;">&amp;</button>
        <button className="btn" data-value="|">|</button>
        <button className="btn" data-value="^">^</button>
        <button className="btn" data-value="~">~</button>
        <button className="btn" data-value="<<">&lt;&lt;</button>
        <button className="btn" data-value=">>">&gt;&gt;</button>
        <button className="btn" data-action="ans">Ans</button>
        <button id="print-tape" className="btn" data-action="print">Print</button>
        <div id="paren-indicator" />
      </div>
      <div id="history" className="history hidden" aria-live="polite" />
    </div>
  );
}

