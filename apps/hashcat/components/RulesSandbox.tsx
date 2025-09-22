'use client';

import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface RuleSets {
  [key: string]: string[];
}

interface Props {
  savedSets: RuleSets;
  onChange: (next: RuleSets) => void;
  setRuleSet: (name: string) => void;
}

const sampleWords = ['password', '123456', 'letmein', 'qwerty'];

const validOps = new Set(['c', 'u', 'l', 'r', 'd', 'p', 't', 's']);

function applyRule(rule: string, word: string) {
  let result = word;
  for (const ch of rule.trim()) {
    switch (ch) {
      case 'c':
        result = result.charAt(0).toUpperCase() + result.slice(1);
        break;
      case 'u':
        result = result.toUpperCase();
        break;
      case 'l':
        result = result.toLowerCase();
        break;
      case 'r':
        result = result.split('').reverse().join('');
        break;
      case 'd':
        result = result + result;
        break;
      default:
        break;
    }
  }
  return result;
}

function parseRules(text: string) {
  const lines: string[] = [];
  const errors: string[] = [];
  text.split('\n').forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    for (const ch of trimmed) {
      if (!validOps.has(ch)) {
        errors.push(`Line ${idx + 1}: invalid command "${ch}"`);
        return;
      }
    }
    lines.push(trimmed);
  });
  return { lines, errors };
}

const RulesSandbox: React.FC<Props> = ({ savedSets, onChange, setRuleSet }) => {
  const [name, setName] = useState('');
  const [rules, setRules] = usePersistentState<string>(
    'hashcatRulesSandbox',
    'c\nu\nr',
  );
  const { lines: ruleLines, errors } = useMemo(() => parseRules(rules), [rules]);

  const save = () => {
    if (!name.trim() || errors.length) return;
    onChange({ ...savedSets, [name.trim()]: ruleLines });
    setRuleSet(name.trim());
  };

  const load = (key: string) => {
    setName(key);
    setRules(savedSets[key].join('\n'));
  };

  const remove = (key: string) => {
    const { [key]: _, ...rest } = savedSets;
    onChange(rest);
  };

  return (
    <div className="space-y-2 mt-4">
      <h2 className="text-xl">Rule Set Editor</h2>
        <input
          className="w-full p-2 text-black"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rule set name"
          aria-label="Rule set name"
        />
        <textarea
          className="w-full h-32 text-black p-2 font-mono"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Enter hashcat rules, one per line"
          aria-label="Hashcat rules"
        />
      {errors.length > 0 && (
        <div className="text-red-400 text-sm">{errors[0]}</div>
      )}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={save}
          className="px-2 py-1 bg-green-600 rounded"
        >
          Save
        </button>
      </div>
      {Object.keys(savedSets).length > 0 && (
        <div className="text-sm space-y-1">
          <div>Saved Sets:</div>
          {Object.keys(savedSets).map((key) => (
            <div key={key} className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => load(key)}
                className="underline"
              >
                {key}
              </button>
              <button
                type="button"
                onClick={() => remove(key)}
                aria-label={`Delete ${key}`}
                className="text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-auto">
        {ruleLines.length === 0 ? (
          <div className="text-sm">(no rules)</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Word</th>
                {ruleLines.map((r) => (
                  <th key={r} className="text-left">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleWords.map((word) => (
                <tr key={word}>
                  <td className="font-mono pr-2">{word}</td>
                  {ruleLines.map((r) => (
                    <td key={r} className="font-mono pr-2">
                      {applyRule(r, word)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RulesSandbox;

