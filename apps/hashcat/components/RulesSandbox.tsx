'use client';

import React, { useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const sampleWords = ['password', '123456', 'letmein', 'qwerty'];

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
        // unsupported commands are ignored
        break;
    }
  }
  return result;
}

const RulesSandbox: React.FC = () => {
  const [rules, setRules] = usePersistentState<string>(
    'hashcatRulesSandbox',
    'c\nu\nr',
  );

  const ruleLines = useMemo(
    () =>
      rules
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')),
    [rules],
  );

  return (
    <div className="space-y-2 mt-4">
      <h2 className="text-xl">Rules Sandbox</h2>
      <textarea
        className="w-full h-32 text-black p-2 font-mono"
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        placeholder="Enter hashcat rules, one per line"
      />
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

