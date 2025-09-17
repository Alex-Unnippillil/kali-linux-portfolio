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
      display.focus();
      display.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <div id="formulas" className="formulas hidden">
      <div className="space-y-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="h-8 w-full"
        />
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="Expression"
          className="h-8 w-full"
        />
        <button onClick={save} className="btn h-8 w-full">
          Save
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
      <ul>
        {formulas.map((f, i) => (
          <li key={i}>
            <button onClick={() => insert(f)}>{f.name}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

