'use client';

import React, { useMemo, useState } from 'react';

export interface PlannerWordlist {
  id: string;
  name: string;
  path: string;
  size: number;
  description: string;
}

export interface PlannerRuleSet {
  id: string;
  name: string;
  multiplier: number;
  description: string;
  sample: string;
}

export interface SimulationResult {
  wordlistCandidates: number;
  maskCandidates: number;
  candidateSpace: number;
  maskTokenCount: number;
  runtimeSeconds: number;
  memoryMB: number;
}

export interface SimulationInput {
  wordlist: PlannerWordlist;
  rule: PlannerRuleSet;
  mask: string;
}

export const WORDLISTS: PlannerWordlist[] = [
  {
    id: 'rockyou',
    name: 'rockyou',
    path: '/usr/share/wordlists/rockyou.txt',
    size: 14344392,
    description: 'Classic breached passwords dump, excellent for demos.',
  },
  {
    id: 'seclists-top1m',
    name: 'SecLists Top 1M',
    path: '/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou-75.txt',
    size: 1000000,
    description: 'Curated one million most common passwords.',
  },
  {
    id: 'keyboard-walks',
    name: 'Keyboard Walks',
    path: '/usr/share/wordlists/keyboard-walks.txt',
    size: 500000,
    description: 'Synthetic keyboard walk patterns and sequences.',
  },
];

export const RULE_SETS: PlannerRuleSet[] = [
  {
    id: 'none',
    name: 'No rules',
    multiplier: 1,
    description: 'Straight attack using the raw wordlist.',
    sample: '',
  },
  {
    id: 'best64',
    name: 'best64',
    multiplier: 64,
    description: 'Popular Hashcat curated set of 64 efficient mangling rules.',
    sample: 'sa se d c u t2 s4',
  },
  {
    id: 'dive',
    name: 'dive',
    multiplier: 120,
    description: 'Aggressive dives into permutations – higher runtime and memory.',
    sample: 'c Az e l r f6',
  },
  {
    id: 'toggle',
    name: 'Toggle 1-6',
    multiplier: 12,
    description: 'Lightweight toggles focused on capitalization variations.',
    sample: 'T1 T2 T3 T4 T5 T6',
  },
];

const MASK_PRESETS: { id: string; label: string }[] = [
  { id: '?d?d?d?d', label: '4 digits (PIN)' },
  { id: '?l?l?l?l?l?l?l?l', label: '8 lowercase' },
  { id: '?u?l?l?l?l?d?d', label: 'Company style' },
  { id: '?a?a?a?a?a?a', label: '6 printable' },
];

const CHARSETS: Record<string, { size: number; label: string }> = {
  d: { size: 10, label: 'digits' },
  l: { size: 26, label: 'lowercase' },
  u: { size: 26, label: 'uppercase' },
  s: { size: 33, label: 'symbols' },
  a: { size: 95, label: 'printable ASCII' },
  h: { size: 16, label: 'hexadecimal' },
  b: { size: 2, label: 'binary' },
};

const BASE_HASHRATE = 1.2e9; // 1.2 billion H/s simulated GPU speed
const BASE_MEMORY_MB = 512;

const formatNumber = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatRuntime = (seconds: number): string => {
  if (seconds < 0.001) {
    return `${(seconds * 1_000_000).toFixed(0)} μs`;
  }
  if (seconds < 1) {
    return `${(seconds * 1_000).toFixed(0)} ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)} h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} d`;
};

export const computeMaskCardinality = (mask: string): {
  cardinality: number;
  tokenCount: number;
} => {
  if (!mask) {
    return { cardinality: 0, tokenCount: 0 };
  }

  let cardinality = 1;
  let tokenCount = 0;
  for (let i = 0; i < mask.length; i += 1) {
    const ch = mask[i];
    if (ch === '?' && i + 1 < mask.length) {
      const symbol = mask[i + 1];
      const charset = CHARSETS[symbol];
      if (charset) {
        cardinality *= charset.size;
        tokenCount += 1;
        i += 1;
        continue;
      }
      // Unknown placeholder, treat as literal
      tokenCount += 1;
      i += 1;
      continue;
    }
    tokenCount += 1;
  }
  return { cardinality, tokenCount };
};

export const simulatePlan = ({
  wordlist,
  rule,
  mask,
}: SimulationInput): SimulationResult => {
  const wordlistCandidates = wordlist.size * Math.max(rule.multiplier, 1);
  const { cardinality, tokenCount } = computeMaskCardinality(mask.trim());
  const maskCandidates = cardinality;
  const candidateSpace = wordlistCandidates + maskCandidates;

  const runtimeSeconds = candidateSpace / BASE_HASHRATE;
  const memoryMB =
    BASE_MEMORY_MB +
    wordlist.size / 50_000 +
    rule.multiplier * 1.5 +
    tokenCount * 24 +
    (maskCandidates > 0 ? Math.log10(maskCandidates + 1) * 32 : 0);

  return {
    wordlistCandidates,
    maskCandidates,
    candidateSpace,
    maskTokenCount: tokenCount,
    runtimeSeconds,
    memoryMB,
  };
};

const Planner: React.FC = () => {
  const [selectedWordlist, setSelectedWordlist] = useState<string>(
    WORDLISTS[0].id,
  );
  const [selectedRule, setSelectedRule] = useState<string>(RULE_SETS[0].id);
  const [mask, setMask] = useState<string>(MASK_PRESETS[0].id);
  const [exportText, setExportText] = useState('');

  const activeWordlist = useMemo(
    () => WORDLISTS.find((w) => w.id === selectedWordlist) ?? WORDLISTS[0],
    [selectedWordlist],
  );

  const activeRule = useMemo(
    () => RULE_SETS.find((r) => r.id === selectedRule) ?? RULE_SETS[0],
    [selectedRule],
  );

  const simulation = useMemo(
    () => simulatePlan({ wordlist: activeWordlist, rule: activeRule, mask }),
    [activeWordlist, activeRule, mask],
  );

  const exportPlan = () => {
    const payload = {
      wordlist: {
        id: activeWordlist.id,
        name: activeWordlist.name,
        size: activeWordlist.size,
        path: activeWordlist.path,
      },
      rule: {
        id: activeRule.id,
        name: activeRule.name,
        multiplier: activeRule.multiplier,
      },
      mask: mask.trim(),
      simulation: {
        candidateSpace: simulation.candidateSpace,
        wordlistCandidates: simulation.wordlistCandidates,
        maskCandidates: simulation.maskCandidates,
        runtimeSeconds: Number(simulation.runtimeSeconds.toFixed(4)),
        memoryMB: Number(simulation.memoryMB.toFixed(1)),
      },
    };
    setExportText(JSON.stringify(payload, null, 2));
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 text-gray-100 h-full overflow-auto">
      <div>
        <h2 className="text-xl font-semibold">Hashcat Plan Builder</h2>
        <p className="text-sm text-gray-300">
          Experiment with wordlists, rule sets, and masks to forecast runtime
          and memory usage for a simulated cracking session.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="wordlist">
            Wordlist
          </label>
          <select
            id="wordlist"
            className="w-full rounded bg-gray-800 border border-gray-700 p-2"
            value={selectedWordlist}
            onChange={(event) => setSelectedWordlist(event.target.value)}
          >
            {WORDLISTS.map((wordlist) => (
              <option key={wordlist.id} value={wordlist.id}>
                {wordlist.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            {formatNumber(activeWordlist.size)} candidates · {activeWordlist.path}
          </p>
          <p className="text-xs text-gray-400">{activeWordlist.description}</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="rule">
            Rule set
          </label>
          <select
            id="rule"
            className="w-full rounded bg-gray-800 border border-gray-700 p-2"
            value={selectedRule}
            onChange={(event) => setSelectedRule(event.target.value)}
          >
            {RULE_SETS.map((ruleSet) => (
              <option key={ruleSet.id} value={ruleSet.id}>
                {ruleSet.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">{activeRule.description}</p>
          {activeRule.sample && (
            <pre className="text-xs bg-gray-800 border border-gray-700 rounded p-2 text-green-300 font-mono whitespace-pre-wrap">
              {activeRule.sample}
            </pre>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-medium" htmlFor="mask">
            Mask pattern
          </label>
          <div className="flex flex-wrap gap-2">
            {MASK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setMask(preset.id)}
                className={`rounded px-2 py-1 text-xs border transition ${
                  mask === preset.id
                    ? 'bg-blue-700 border-blue-400 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <input
          id="mask"
          className="w-full rounded bg-gray-800 border border-gray-700 p-2 font-mono"
          value={mask}
          onChange={(event) => setMask(event.target.value)}
          placeholder="?l?l?l?l?d?d"
        />
        <p className="text-xs text-gray-400">
          Use Hashcat mask syntax (?l lowercase, ?u uppercase, ?d digits, ?s
          symbols, ?a printable ASCII).
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="bg-gray-800 border border-gray-700 rounded p-3 space-y-1">
          <div className="text-sm uppercase tracking-wide text-gray-400">
            Candidate space
          </div>
          <div className="text-2xl font-semibold" data-testid="candidate-total">
            {formatNumber(simulation.candidateSpace)}
          </div>
          <div className="text-xs text-gray-400">
            Wordlist × rules: {formatNumber(simulation.wordlistCandidates)}
          </div>
          <div className="text-xs text-gray-400">
            Mask: {formatNumber(simulation.maskCandidates)}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
          <div>
            <div className="text-sm uppercase tracking-wide text-gray-400">
              Estimated runtime
            </div>
            <div className="text-xl font-semibold" data-testid="runtime">
              {formatRuntime(simulation.runtimeSeconds)}
            </div>
            <div className="text-xs text-gray-400">
              Assumes {formatNumber(BASE_HASHRATE)} H/s GPU throughput.
            </div>
          </div>
          <div>
            <div className="text-sm uppercase tracking-wide text-gray-400">
              Estimated memory
            </div>
            <div className="text-xl font-semibold" data-testid="memory">
              {simulation.memoryMB.toFixed(1)} MB
            </div>
            <div className="text-xs text-gray-400">
              Includes rule cache and mask staging (tokens: {simulation.maskTokenCount}).
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <button
          type="button"
          onClick={exportPlan}
          className="self-start rounded bg-blue-700 hover:bg-blue-600 transition px-3 py-2 text-sm font-medium"
        >
          Export plan as JSON
        </button>
        {exportText && (
          <pre
            className="bg-black text-green-400 border border-gray-800 rounded p-3 text-xs font-mono whitespace-pre-wrap"
            data-testid="export-output"
          >
            {exportText}
          </pre>
        )}
      </section>
    </div>
  );
};

export default Planner;

