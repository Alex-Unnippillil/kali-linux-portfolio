'use client';

import React, { useEffect, useMemo, useState } from 'react';
import StatsChart from '../../StatsChart';
import usePersistentState from '../../../hooks/usePersistentState';

type CustomSetKey = '1' | '2' | '3' | '4';

type CustomSets = Record<CustomSetKey, string>;

type CharsetDefinition = {
  token: string;
  label: string;
  size: number;
  hint?: string;
};

type TokenSource = 'builtin' | 'custom' | 'literal' | 'unknown';

type TokenInfo = {
  token: string;
  size: number;
  description: string;
  source: TokenSource;
};

type SpeedModel = {
  id: string;
  label: string;
  rate: number;
};

type DurationEstimate = {
  id: string;
  label: string;
  seconds: number;
  formatted: string;
};

type MaskStats = {
  tokens: TokenInfo[];
  combinations: number;
  overflow: boolean;
  entropy: number;
  durations: DurationEstimate[];
  warnings: string[];
};

type SessionPlanSnapshot = {
  mask: string;
  combinations: number;
  overflow: boolean;
  entropy: number;
  durations: DurationEstimate[];
  tokens: TokenInfo[];
  warnings: string[];
  updatedAt: string;
};

type MaskBuilderProps = {
  mask: string;
  onMaskChange: (next: string) => void;
  onStatsChange?: (stats: MaskStats) => void;
  sessionPlanKey?: string;
};

const BUILTIN_CHARSETS: CharsetDefinition[] = [
  {
    token: '?l',
    label: 'Lowercase (a-z)',
    size: 26,
    hint: 'abcdef',
  },
  {
    token: '?u',
    label: 'Uppercase (A-Z)',
    size: 26,
    hint: 'ABCDEF',
  },
  {
    token: '?d',
    label: 'Digits (0-9)',
    size: 10,
    hint: '012345',
  },
  {
    token: '?s',
    label: 'Symbols',
    size: 33,
    hint: '!@#$',
  },
  {
    token: '?a',
    label: 'All printable',
    size: 95,
    hint: 'Aa1!~',
  },
];

const SPEED_MODELS: SpeedModel[] = [
  { id: 'cpu', label: 'Laptop CPU (~50 MH/s)', rate: 50_000_000 },
  { id: 'gpu', label: 'Single GPU (~8 GH/s)', rate: 8_000_000_000 },
  { id: 'cluster', label: 'GPU Cluster (~40 GH/s)', rate: 40_000_000_000 },
];

const MAX_COMBINATIONS_SOFT = 1e12;
const MAX_COMBINATIONS_HARD = 1e18;
const MAX_SEGMENTS = 64;

const defaultCustomSets: CustomSets = {
  '1': 'aeiou',
  '2': '0123456789',
  '3': '',
  '4': '',
};

const defaultPlan: SessionPlanSnapshot = {
  mask: '',
  combinations: 0,
  overflow: false,
  entropy: 0,
  durations: [],
  tokens: [],
  warnings: [],
  updatedAt: '',
};

const customSetKeys: CustomSetKey[] = ['1', '2', '3', '4'];

const isCustomSets = (value: unknown): value is CustomSets => {
  if (!value || typeof value !== 'object') return false;
  return customSetKeys.every((key) => typeof (value as Record<string, unknown>)[key] === 'string');
};

const isPlanSnapshot = (value: unknown): value is SessionPlanSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as SessionPlanSnapshot;
  return (
    typeof snapshot.mask === 'string' &&
    typeof snapshot.combinations === 'number' &&
    typeof snapshot.overflow === 'boolean' &&
    typeof snapshot.entropy === 'number' &&
    Array.isArray(snapshot.durations) &&
    Array.isArray(snapshot.tokens) &&
    Array.isArray(snapshot.warnings) &&
    typeof snapshot.updatedAt === 'string'
  );
};

const formatNumber = (value: number) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-US').format(Math.round(value))
    : '∞';

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds === Infinity) return '∞';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  const units = [
    { label: 'y', value: 60 * 60 * 24 * 365 },
    { label: 'd', value: 60 * 60 * 24 },
    { label: 'h', value: 60 * 60 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 },
  ];
  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  for (const unit of units) {
    if (remaining >= unit.value) {
      const count = Math.floor(remaining / unit.value);
      parts.push(`${count}${unit.label}`);
      remaining -= count * unit.value;
    }
    if (parts.length === 2) break;
  }
  if (parts.length === 0) {
    return `${seconds.toFixed(1)}s`;
  }
  return parts.join(' ');
};

const parseMask = (mask: string, sets: CustomSets): TokenInfo[] => {
  const tokens: TokenInfo[] = [];
  for (let i = 0; i < mask.length; i += 1) {
    const ch = mask[i];
    if (ch === '?' && i < mask.length - 1) {
      const next = mask[i + 1];
      if (next === '?') {
        tokens.push({
          token: '?',
          size: 1,
          description: 'Literal ?',
          source: 'literal',
        });
        i += 1;
        continue;
      }
      const builtin = BUILTIN_CHARSETS.find((def) => def.token === `?${next}`);
      if (builtin) {
        tokens.push({
          token: builtin.token,
          size: builtin.size,
          description: builtin.label,
          source: 'builtin',
        });
        i += 1;
        continue;
      }
      if (customSetKeys.includes(next as CustomSetKey)) {
        const key = next as CustomSetKey;
        const setValue = sets[key] || '';
        const uniqueCount = new Set(setValue.split('')).size;
        tokens.push({
          token: `?${key}`,
          size: uniqueCount,
          description: `Custom charset ?${key} (${uniqueCount} chars)`,
          source: 'custom',
        });
        i += 1;
        continue;
      }
      tokens.push({
        token: `?${next}`,
        size: 1,
        description: `Unknown token ?${next} (treated as literal)`,
        source: 'unknown',
      });
      i += 1;
    } else {
      tokens.push({
        token: ch,
        size: 1,
        description: `Literal "${ch}"`,
        source: 'literal',
      });
    }
  }
  return tokens;
};

const computeStats = (mask: string, sets: CustomSets): MaskStats => {
  if (!mask.trim()) {
    return {
      tokens: [],
      combinations: 0,
      overflow: false,
      entropy: 0,
      durations: SPEED_MODELS.map((model) => ({
        ...model,
        seconds: 0,
        formatted: '0s',
      })),
      warnings: [],
    };
  }

  const tokens = parseMask(mask, sets);
  let combinations = 1;
  let overflow = false;
  const warnings: string[] = [];

  for (const token of tokens) {
    if (token.size === 0) {
      warnings.push(
        `${token.token} has no characters defined. Update the charset before running.`,
      );
      combinations = 0;
      break;
    }
    combinations *= token.size;
    if (!Number.isFinite(combinations) || combinations > MAX_COMBINATIONS_HARD) {
      overflow = true;
      combinations = MAX_COMBINATIONS_HARD;
      break;
    }
  }

  if (tokens.length > MAX_SEGMENTS) {
    warnings.push(
      `Mask length ${tokens.length} exceeds recommended limit (${MAX_SEGMENTS}). Consider splitting into sessions.`,
    );
  }

  if (!overflow && combinations > MAX_COMBINATIONS_SOFT) {
    warnings.push(
      `Candidate space ${formatNumber(combinations)} is very large. Plan multiple sessions or leverage rules instead of pure brute-force.`,
    );
  }

  if (overflow) {
    warnings.push(
      'Candidate space exceeds calculator limits. Break the mask into smaller pieces for session planning.',
    );
  }

  const entropy = tokens.reduce((acc, token) => {
    if (token.size <= 1) return acc;
    return acc + Math.log2(token.size);
  }, 0);

  const durations = SPEED_MODELS.map((model) => {
    if (combinations === 0) {
      return { ...model, seconds: 0, formatted: '0s' };
    }
    const rawSeconds = overflow ? Infinity : combinations / model.rate;
    const finiteSeconds = Number.isFinite(rawSeconds)
      ? rawSeconds
      : Number.MAX_SAFE_INTEGER;
    return {
      ...model,
      seconds: finiteSeconds,
      formatted: Number.isFinite(rawSeconds)
        ? formatDuration(rawSeconds)
        : '∞',
    };
  });

  return {
    tokens,
    combinations,
    overflow,
    entropy,
    durations,
    warnings,
  };
};

const MaskBuilder: React.FC<MaskBuilderProps> = ({
  mask,
  onMaskChange,
  onStatsChange,
  sessionPlanKey = 'hashcat-session-plan',
}) => {
  const [internalMask, setInternalMask] = useState(mask);
  const [repeat, setRepeat] = useState(1);
  const [literal, setLiteral] = useState('');

  const [customSets, setCustomSets] = usePersistentState<CustomSets>(
    'hashcat-mask-custom-sets',
    defaultCustomSets,
    isCustomSets,
  );

  const [, setSessionPlan] = usePersistentState<SessionPlanSnapshot>(
    sessionPlanKey,
    defaultPlan,
    isPlanSnapshot,
  );

  useEffect(() => {
    setInternalMask(mask);
  }, [mask]);

  const stats = useMemo(
    () => computeStats(internalMask, customSets),
    [internalMask, customSets],
  );

  useEffect(() => {
    onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  useEffect(() => {
    const snapshot: SessionPlanSnapshot = {
      mask: internalMask,
      combinations: stats.combinations,
      overflow: stats.overflow,
      entropy: stats.entropy,
      durations: stats.durations,
      tokens: stats.tokens,
      warnings: stats.warnings,
      updatedAt: internalMask ? new Date().toISOString() : '',
    };
    setSessionPlan(snapshot);
  }, [internalMask, setSessionPlan, stats]);

  const updateMask = (next: string) => {
    setInternalMask(next);
    onMaskChange(next);
  };

  const handleAddToken = (token: string) => {
    if (!token) return;
    const multiplier = Math.max(1, Math.min(repeat, 64));
    const repeated = token.repeat(multiplier);
    updateMask(`${internalMask}${repeated}`);
  };

  const handleLiteralAdd = () => {
    if (!literal) return;
    updateMask(`${internalMask}${literal}`);
    setLiteral('');
  };

  const handleCustomSetChange = (key: CustomSetKey, value: string) => {
    setCustomSets((prev) => ({ ...prev, [key]: value }));
  };

  const clearMask = () => {
    updateMask('');
  };

  const exportMask = () => {
    if (!internalMask) return;
    try {
      const blob = new Blob([internalMask], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const safeMask = internalMask.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-');
      anchor.download = `mask-${safeMask || 'pattern'}.hcmask`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download errors in unsupported environments
    }
  };

  const repeatLabel = repeat === 1 ? 'x1' : `x${repeat}`;

  return (
    <div className="w-full max-w-xl rounded border border-white/10 bg-black/40 p-3 text-sm text-white">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Mask Builder</h2>
          <p className="text-xs text-gray-300">
            Assemble Hashcat masks with presets or custom charsets. Stats update as you plan.
          </p>
        </div>
        <button
          type="button"
          onClick={clearMask}
          className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Clear
        </button>
      </div>

      <label htmlFor="hashcat-mask-builder-input" className="sr-only">
        Mask pattern
      </label>
      <textarea
        id="hashcat-mask-builder-input"
        value={internalMask}
        onChange={(event) => updateMask(event.target.value)}
        className="h-20 w-full rounded bg-gray-900 p-2 font-mono text-xs text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        placeholder="?u?l?l?l?d?d"
        aria-describedby="hashcat-mask-builder-help"
        aria-label="Mask pattern"
      />
      <p id="hashcat-mask-builder-help" className="mt-1 text-[11px] text-gray-300">
        Click presets below or type directly. Use ?? for a literal question mark.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">Character classes</span>
            <div className="flex items-center gap-1 text-[11px] text-gray-300">
              <label
                htmlFor="hashcat-mask-repeat"
                id="hashcat-mask-repeat-label"
                className="mr-1"
              >
                Repeat
              </label>
              <input
                id="hashcat-mask-repeat"
                type="range"
                min={1}
                max={16}
                value={repeat}
                onChange={(event) => setRepeat(Number(event.target.value))}
                className="h-1 w-28 appearance-none rounded bg-gray-700"
                aria-labelledby="hashcat-mask-repeat-label"
              />
              <input
                type="number"
                min={1}
                max={64}
                value={repeat}
                onChange={(event) => setRepeat(Number(event.target.value) || 1)}
                className="w-12 rounded bg-gray-900 px-1 py-0.5 text-right text-xs"
                aria-label="Repeat count"
              />
              <span className="rounded bg-gray-800 px-1 py-0.5 text-[10px]">{repeatLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_CHARSETS.map((charset) => (
              <button
                key={charset.token}
                type="button"
                onClick={() => handleAddToken(charset.token)}
                className="flex flex-col items-center rounded border border-white/10 bg-gray-800 px-2 py-1 text-xs hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                <span className="font-mono text-sm">{charset.token}</span>
                <span className="text-[10px] text-gray-300">{charset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Custom charsets</div>
          {customSetKeys.map((key) => {
            const value = customSets[key];
            const uniqueCount = new Set(value.split('')).size;
            return (
              <div key={key} className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={`hashcat-mask-custom-${key}`}
                  className="text-xs"
                  id={`hashcat-mask-custom-${key}-label`}
                >
                  ?{key}
                </label>
                <input
                  id={`hashcat-mask-custom-${key}`}
                    type="text"
                    value={value}
                    onChange={(event) => handleCustomSetChange(key, event.target.value)}
                    className="flex-1 min-w-[120px] rounded bg-gray-900 px-2 py-1 text-xs"
                    placeholder="abc123"
                    aria-labelledby={`hashcat-mask-custom-${key}-label`}
                    aria-label={`Characters for custom set ?${key}`}
                  />
                <span className="text-[11px] text-gray-300">{uniqueCount} chars</span>
                <button
                  type="button"
                  onClick={() => handleAddToken(`?${key}`)}
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-black hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                  disabled={!uniqueCount}
                >
                  Add
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="font-medium">Literals</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={literal}
              onChange={(event) => setLiteral(event.target.value)}
              placeholder="2024"
              className="flex-1 min-w-[140px] rounded bg-gray-900 px-2 py-1 text-xs"
              aria-label="Literal text"
            />
            <button
              type="button"
              onClick={handleLiteralAdd}
              className="rounded bg-green-600 px-2 py-1 text-xs text-black hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-200"
              disabled={!literal}
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => handleAddToken('?d'.repeat(4))}
              className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
            >
              Add year (?d×4)
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-medium">Mask summary</div>
            <div className="text-[11px] text-gray-300">
              Segments: {stats.tokens.length} · Entropy: {stats.entropy.toFixed(1)} bits
            </div>
          </div>
          <div className="text-right text-sm font-semibold">
            Candidates:{' '}
            <span className="font-mono">
              {stats.overflow
                ? `> ${formatNumber(MAX_COMBINATIONS_HARD)}`
                : formatNumber(stats.combinations)}
            </span>
          </div>
        </div>
        {!stats.tokens.length ? (
          <div className="rounded border border-dashed border-white/10 p-3 text-xs text-gray-300">
            Build a mask to preview cracking estimates.
          </div>
        ) : (
          <>
            <div className="rounded border border-white/10 bg-gray-900/80 p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {stats.durations.map((model) => (
                  <div key={model.id} className="rounded bg-black/40 p-2 text-xs">
                    <div className="font-semibold">{model.label}</div>
                    <div className="font-mono text-sm">{model.formatted}</div>
                  </div>
                ))}
              </div>
              {!stats.overflow && stats.combinations > 0 && (
                <StatsChart
                  count={stats.combinations}
                  time={stats.combinations / 1_000_000}
                />
              )}
            </div>
            <div className="overflow-auto rounded border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-xs">
                <thead className="bg-black/40">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Token</th>
                    <th className="px-2 py-1 text-left font-medium">Description</th>
                    <th className="px-2 py-1 text-right font-medium">Charset size</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tokens.map((token, index) => (
                    <tr key={`${token.token}-${index}`} className="odd:bg-black/20">
                      <td className="px-2 py-1 font-mono">{token.token}</td>
                      <td className="px-2 py-1">{token.description}</td>
                      <td className="px-2 py-1 text-right">{token.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {stats.warnings.length > 0 && (
        <div className="mt-3 rounded border border-yellow-400/50 bg-yellow-500/10 p-2 text-xs text-yellow-200">
          <div className="mb-1 font-semibold text-yellow-100">Session planning warnings</div>
          <ul className="list-disc space-y-1 pl-4">
            {stats.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportMask}
          disabled={!internalMask}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-black transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
        >
          Export mask (.hcmask)
        </button>
        <button
          type="button"
          onClick={() => updateMask(`${internalMask}?a?a?a?a`)}
          className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
        >
          Add 4×?a
        </button>
      </div>
    </div>
  );
};

export type { MaskStats, TokenInfo, DurationEstimate };
export default MaskBuilder;
