import React, { useEffect, useRef } from 'react';
import { colorDefinitions } from '../../../components/apps/wireshark/colorDefs';
import {
  finalizeInteraction,
  recordChecksum,
  recordMemorySample,
  resetInteractionMetrics,
} from './interactionMetrics';

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
  const initialRulesRef = useRef(rules);

  useEffect(() => {
    resetInteractionMetrics();
    recordMemorySample('mount', initialRulesRef.current);
    recordChecksum(initialRulesRef.current, 'mount');
    return () => {
      recordMemorySample('unmount', []);
    };
  }, []);

  const commitRules = (
    updated: Rule[],
    event: string,
    startedAt?: number
  ) => {
    onChange(updated);
    finalizeInteraction(event, startedAt, updated);
  };

  const handleRuleChange = (
    index: number,
    field: keyof Rule,
    value: string,
    startedAt?: number
  ) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    commitRules(updated, 'rule-change', startedAt);
  };

  const handleAdd = (startedAt?: number) => {
    commitRules([...rules, { expression: '', color: '' }], 'add-rule', startedAt);
  };

  const handleRemove = (index: number, startedAt?: number) => {
    commitRules(
      rules.filter((_, i) => i !== index),
      'remove-rule',
      startedAt
    );
  };

  const handleExport = (startedAt?: number) => {
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
    finalizeInteraction('export', startedAt, rules);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startedAt = e.timeStamp;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (Array.isArray(parsed)) {
            const sanitized = parsed
              .map((entry) => ({
                expression: typeof entry.expression === 'string' ? entry.expression : '',
                color: typeof entry.color === 'string' ? entry.color : '',
              }))
              .filter((entry) => entry.expression || entry.color);
            commitRules(sanitized, 'import', startedAt);
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

  const handleClear = (startedAt?: number) => {
    commitRules([], 'clear', startedAt);
  };

  return (
    <div className="flex flex-col space-y-1">
      {rules.map((rule, i) => (
        <div key={i} className="flex space-x-1">
          <input
            value={rule.expression}
            onChange={(e) =>
              handleRuleChange(i, 'expression', e.target.value, e.timeStamp)
            }
            placeholder="Filter expression"
            className="px-1 py-0.5 bg-gray-800 rounded text-white text-xs"
          />
          <select
            value={rule.color}
            onChange={(e) =>
              handleRuleChange(i, 'color', e.target.value, e.timeStamp)
            }
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
            onClick={(e) => handleRemove(i, e.timeStamp)}
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
          onClick={(e) => handleAdd(e.timeStamp)}
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
          onClick={(e) => handleExport(e.timeStamp)}
          type="button"
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
        >
          Export JSON
        </button>
        <button
          onClick={(e) => handleClear(e.timeStamp)}
          type="button"
          className="px-1 py-0.5 bg-gray-700 rounded text-xs"
        >
          Clear rules
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

