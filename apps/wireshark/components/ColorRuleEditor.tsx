import React, { useRef } from 'react';
import { colorDefinitions } from '../../../components/apps/wireshark/colorDefs';

interface Rule {
  expression: string;
  color: string;
}

interface Props {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

const ColorRuleEditor: React.FC<Props> = ({ rules, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRuleChange = (
    index: number,
    field: keyof Rule,
    value: string
  ) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...rules, { expression: '', color: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    const json = JSON.stringify(rules, null, 2);
    if (navigator?.clipboard?.writeText) {
      try {
        navigator.clipboard.writeText(json);
      } catch {
        // ignore clipboard errors
      }
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'color-rules.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (Array.isArray(parsed)) {
            onChange(parsed);
          }
        } catch {
          // ignore invalid JSON
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const triggerImport = () => fileRef.current?.click();

  return (
    <div className="flex flex-col space-y-1 text-[11px] text-kali-terminal">
      {rules.map((rule, i) => (
        <div key={i} className="flex space-x-1">
          <input
            value={rule.expression}
            onChange={(e) => handleRuleChange(i, 'expression', e.target.value)}
            placeholder="Filter expression"
            aria-label="Filter expression"
            className="w-32 rounded border border-kali-border/40 bg-kali-surface/90 px-2 py-1 text-[11px] text-kali-terminal placeholder:text-kali-terminal/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-primary/70"
          />
          <select
            value={rule.color}
            onChange={(e) => handleRuleChange(i, 'color', e.target.value)}
            aria-label="Color"
            className="rounded border border-kali-border/40 bg-kali-surface/90 px-2 py-1 text-[11px] text-kali-terminal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-primary/70"
          >
            <option value="">Select color</option>
            {colorDefinitions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleRemove(i)}
            aria-label="Remove rule"
            className="rounded border border-kali-border/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400/60"
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex space-x-1">
        <button
          onClick={handleAdd}
          type="button"
          className="rounded border border-kali-border/40 bg-kali-primary/20 px-2 py-1 text-[11px] font-semibold text-kali-terminal transition hover:bg-kali-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-primary/70"
        >
          Add rule
        </button>
        <button
          onClick={triggerImport}
          type="button"
          className="rounded border border-kali-border/40 bg-kali-primary/20 px-2 py-1 text-[11px] font-semibold text-kali-terminal transition hover:bg-kali-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-primary/70"
        >
          Import JSON
        </button>
        <button
          onClick={handleExport}
          type="button"
          className="rounded border border-kali-border/40 bg-kali-primary/20 px-2 py-1 text-[11px] font-semibold text-kali-terminal transition hover:bg-kali-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-primary/70"
        >
          Export JSON
        </button>
      </div>
      <input
        type="file"
        accept="application/json"
        ref={fileRef}
        onChange={handleImport}
        aria-label="Color rules JSON file"
        className="hidden"
      />
    </div>
  );
};

export default ColorRuleEditor;

