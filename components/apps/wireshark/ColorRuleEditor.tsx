import React, { useRef } from 'react';
import { colorDefinitions } from './colorDefs';

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
    <div className="flex flex-col space-y-1">
      {rules.map((rule, i) => (
        <div key={i} className="flex space-x-1">
          <input
            value={rule.expression}
            onChange={(e) => handleRuleChange(i, 'expression', e.target.value)}
            placeholder="Filter expression"
            aria-label="Filter expression"
            className="px-1 py-0.5 bg-gray-800 rounded text-white text-xs"
          />
          <select
            value={rule.color}
            onChange={(e) => handleRuleChange(i, 'color', e.target.value)}
            aria-label="Color"
            className="px-1 py-0.5 bg-gray-800 rounded text-white text-xs"
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
            className="px-1 py-0.5 bg-gray-700 rounded text-xs"
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
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
        >
          Add rule
        </button>
        <button
          onClick={triggerImport}
          type="button"
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
        >
          Import JSON
        </button>
        <button
          onClick={handleExport}
          type="button"
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
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
