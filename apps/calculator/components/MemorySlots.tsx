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
    display.dispatchEvent(new Event('input', { bubbles: true }));
    display.focus();
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
    <div className="memory-slots space-y-3 rounded-2xl border border-white/5 bg-[#15171d] p-4 text-sm text-slate-200 shadow-inner">
      <div className="memory-form flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="var"
          aria-label="variable name"
          className="w-20 flex-1 rounded-lg border border-white/10 bg-[#0f1117] px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-100 placeholder:text-slate-500 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        />
        <button
          type="button"
          onClick={() => {
            handleStore(name.trim());
            setName('');
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15171d]"
        >
          Store
        </button>
      </div>
      <div className="memory-list max-h-44 space-y-2 overflow-y-auto pr-1">
        {Object.entries(vars).map(([n, v]) => (
          <div key={n} className="memory-item flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
            <button
              type="button"
              onClick={() => handleInsert(n)}
              className="rounded-lg bg-[#2a2d35] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#f97316]"
            >
              {n}
            </button>
            <span className="value flex-1 truncate font-mono text-slate-100">{v}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStore(n)}
                aria-label={`store ${n}`}
                className="rounded-full bg-[#2a2d35] px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-[#343842]"
              >
                ↲
              </button>
              <button
                type="button"
                onClick={() => handleDelete(n)}
                aria-label={`delete ${n}`}
                className="rounded-full bg-[#2a2d35] px-2 py-1 text-xs font-semibold text-[#f97316] transition hover:bg-[#3d1e0a]"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {Object.keys(vars).length === 0 && (
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Memory is empty
          </p>
        )}
      </div>
    </div>
  );
}
