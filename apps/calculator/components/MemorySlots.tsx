'use client';
import { useState, useEffect } from 'react';
import { useVariables } from '../state';

export default function MemorySlots() {
  const [vars, setVars] = useVariables();
  const [name, setName] = useState('');
  const [evaluate, setEvaluate] = useState<null | ((expr: string) => string | null)>(null);

  useEffect(() => {
    import('../main').then((m) => {
      const fn = (m as any).evaluate || (m as any).default?.evaluate;
      if (typeof fn === 'function') setEvaluate(() => fn);
    });
  }, []);

  const insertAtCursor = (text: string) => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (!display) return;
    const start = display.selectionStart ?? display.value.length;
    const end = display.selectionEnd ?? display.value.length;
    display.value = display.value.slice(0, start) + text + display.value.slice(end);
    const pos = start + text.length;
    display.selectionStart = display.selectionEnd = pos;
    display.focus();
    display.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const handleStore = (n: string) => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (!display || !n) return;
    let val = display.value;
    if (evaluate) {
      const res = evaluate(val);
      if (res === null || res === 'Error') return;
      val = res;
    }
    setVars((prev) => ({ ...prev, [n]: val }));
  };

  const handleInsert = (n: string) => insertAtCursor(n);

  const handleDelete = (n: string) => {
    const copy = { ...vars };
    delete copy[n];
    setVars(copy);
  };

  return (
    <div className="memory-slots">
      <div className="memory-form">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="var"
          aria-label="variable name"
        />
        <button onClick={() => { handleStore(name.trim()); setName(''); }}>Store</button>
      </div>
      <div className="memory-list">
        {Object.entries(vars).map(([n, v]) => (
          <div key={n} className="memory-item">
            <button onClick={() => handleInsert(n)}>{n}</button>
            <span className="value">{v}</span>
            <button onClick={() => handleStore(n)} aria-label={`store ${n}`}>↲</button>
            <button onClick={() => handleDelete(n)} aria-label={`delete ${n}`}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
