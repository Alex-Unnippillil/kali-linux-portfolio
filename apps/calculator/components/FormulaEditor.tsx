import { useState } from 'react';
import { type Formula } from '../formulas';

interface Props {
  formulas: Formula[];
  onAdd: (name: string, expression: string) => void;
  onInsert: (expression: string) => void;
}

export default function FormulaEditor({ formulas, onAdd, onInsert }: Props) {
  const [name, setName] = useState('');
  const [expr, setExpr] = useState('');

  return (
    <section className="space-y-2 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-sm" />
        <input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="Expression" className="rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-sm" />
      </div>
      <button type="button" onClick={() => { onAdd(name.trim(), expr.trim()); setName(''); setExpr(''); }} className="rounded bg-[var(--kali-panel)] px-2 py-1 text-xs">Save formula</button>
      <div className="space-y-1">
        {formulas.map((formula) => (
          <button key={`${formula.name}-${formula.expr}`} type="button" onClick={() => onInsert(formula.expr)} className="flex w-full justify-between rounded border border-[color:var(--kali-border)]/40 bg-[var(--kali-panel)] px-2 py-1 text-left text-xs">
            <span>{formula.name}</span><span>{formula.expr}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
