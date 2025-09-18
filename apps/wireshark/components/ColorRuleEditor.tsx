import React, { useRef } from 'react';
import { colorDefinitions } from '../../../components/apps/wireshark/colorDefs';
import {
  ColorRule,
  parseColorRules,
  serializeColorRules,
} from './colorRuleUtils';

interface Props {
  rules: ColorRule[];
  onChange: (rules: ColorRule[]) => void;
  onReset?: () => void;
  defaultRules?: ColorRule[];
}

const ColorRuleEditor: React.FC<Props> = ({
  rules,
  onChange,
  onReset,
  defaultRules = [],
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRuleChange = (
    index: number,
    field: keyof ColorRule,
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
    const json = serializeColorRules(rules);
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
          const parsed = parseColorRules(reader.result as string);
          onChange(parsed);
        } catch {
          // ignore invalid JSON
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const triggerImport = () => fileRef.current?.click();

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onChange(defaultRules.map((rule) => ({ ...rule })));
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      {rules.map((rule, i) => (
        <div key={i} className="flex space-x-1">
          <input
            value={rule.expression}
            onChange={(e) => handleRuleChange(i, 'expression', e.target.value)}
            placeholder="Filter expression"
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
        <button
          onClick={handleReset}
          type="button"
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
        >
          Reset
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

