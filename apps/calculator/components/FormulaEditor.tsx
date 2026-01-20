import { useState } from 'react';
import { useFormulas, validateFormula, Formula } from '../formulas';

export default function FormulaEditor() {
  const [formulas, setFormulas] = useFormulas();
  const [name, setName] = useState('');
  const [expr, setExpr] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    if (!name.trim() || !expr.trim()) {
      setError('Name and expression required');
      return;
    }
    if (!validateFormula(expr)) {
      setError('Invalid formula');
      return;
    }
    setFormulas([...formulas, { name: name.trim(), expr }]);
    setName('');
    setExpr('');
    setError('');
  };

  const insert = (f: Formula) => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (display) {
      const start = display.selectionStart ?? display.value.length;
      const end = display.selectionEnd ?? display.value.length;
      display.value = display.value.slice(0, start) + f.expr + display.value.slice(end);
      const pos = start + f.expr.length;
      display.selectionStart = display.selectionEnd = pos;
      display.dispatchEvent(new Event('input', { bubbles: true }));
      display.focus();
    }
  };

  return (
    <div
      id="formulas"
      className="formulas hidden space-y-4 rounded-2xl border border-dashed border-white/10 bg-[#15171d] p-4 text-sm text-slate-200 shadow-inner"
    >
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border border-white/10 bg-[#0f1117] px-3 py-2 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          />
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="Expression"
            className="rounded-lg border border-white/10 bg-[#0f1117] px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          />
        </div>
        <button
          type="button"
          onClick={save}
          className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15171d]"
        >
          Save formula
        </button>
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      </div>
      <ul className="space-y-2">
        {formulas.length === 0 && (
          <li className="text-xs uppercase tracking-[0.3em] text-slate-500">No formulas saved</li>
        )}
        {formulas.map((f, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => insert(f)}
              className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <span>{f.name}</span>
              <span className="font-mono text-xs text-slate-400">{f.expr}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
