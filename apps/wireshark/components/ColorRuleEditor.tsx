import React from 'react';
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
      <button
        onClick={handleAdd}
        type="button"
        className="px-1 py-0.5 bg-gray-700 rounded text-xs"
      >
        Add rule
      </button>
    </div>
  );
};

export default ColorRuleEditor;

