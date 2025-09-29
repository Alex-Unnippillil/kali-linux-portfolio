'use client';

import React, { useMemo } from 'react';
import StatsChart from '../../../components/StatsChart';

const SPECIAL_CHARACTERS = [
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  '[',
  '\\',
  ']',
  '^',
  '_',
  '`',
  '{',
  '|',
  '}',
  '~',
];

const LOWER = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
const UPPER = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const DIGITS = Array.from({ length: 10 }, (_, i) => String(i));

const CHARSETS: Record<string, string[]> = {
  '?l': LOWER,
  '?u': UPPER,
  '?d': DIGITS,
  '?s': SPECIAL_CHARACTERS,
  '?a': [...LOWER, ...UPPER, ...DIGITS, ...SPECIAL_CHARACTERS],
};

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export type MaskPartType = 'charset' | 'literal' | 'invalid';

export interface MaskPart {
  type: MaskPartType;
  raw: string;
  start: number;
  end: number;
  charset?: string[];
  error?: string;
}

export interface MaskAnalysis {
  parts: MaskPart[];
  errors: string[];
  preview: string[];
  candidateCount: bigint;
  estimatedSeconds: number;
  hasErrors: boolean;
}

const safeNumberFromBigInt = (value: bigint): number => {
  if (value > MAX_SAFE_BIGINT) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
    return Number.MIN_SAFE_INTEGER;
  }
  return Number(value);
};

const generatePreview = (
  segments: string[][],
  limit: number,
): string[] => {
  const results: string[] = [];
  if (segments.length === 0) {
    return results;
  }

  const current: string[] = [];

  const backtrack = (index: number) => {
    if (results.length >= limit) {
      return;
    }

    if (index === segments.length) {
      results.push(current.join(''));
      return;
    }

    const choices = segments[index];
    for (const value of choices) {
      current.push(value);
      backtrack(index + 1);
      current.pop();
      if (results.length >= limit) {
        break;
      }
    }
  };

  backtrack(0);
  return results;
};

export const analyzeMask = (
  mask: string,
  previewLimit = 20,
): MaskAnalysis => {
  const parts: MaskPart[] = [];
  const errors: string[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    const ch = mask[index];
    if (ch === '?') {
      const next = mask[index + 1];
      if (!next) {
        const part: MaskPart = {
          type: 'invalid',
          raw: '?',
          start: index,
          end: index + 1,
          error: 'Dangling placeholder',
        };
        parts.push(part);
        errors.push(part.error);
        continue;
      }

      const token = `?${next}`;
      if (token === '??') {
        parts.push({
          type: 'literal',
          raw: '?',
          start: index,
          end: index + 2,
        });
      } else if (CHARSETS[token]) {
        parts.push({
          type: 'charset',
          raw: token,
          start: index,
          end: index + 2,
          charset: CHARSETS[token],
        });
      } else {
        const part: MaskPart = {
          type: 'invalid',
          raw: token,
          start: index,
          end: index + 2,
          error: `Unknown token ${token}`,
        };
        parts.push(part);
        errors.push(part.error);
      }
      index += 1;
    } else {
      parts.push({
        type: 'literal',
        raw: ch,
        start: index,
        end: index + 1,
      });
    }
  }

  const hasErrors = errors.length > 0;

  let candidateCount = BigInt(hasErrors ? 0 : 1);
  const previewSegments: string[][] = [];

  if (!hasErrors) {
    for (const part of parts) {
      if (part.type === 'charset' && part.charset) {
        candidateCount *= BigInt(part.charset.length);
        previewSegments.push(part.charset);
      } else if (part.type === 'literal') {
        previewSegments.push([part.raw]);
      }
    }
  }

  const estimatedSeconds = hasErrors
    ? 0
    : safeNumberFromBigInt(candidateCount) / 1_000_000;

  const preview = hasErrors
    ? []
    : generatePreview(previewSegments, previewLimit);

  return {
    parts,
    errors,
    preview,
    candidateCount,
    estimatedSeconds,
    hasErrors,
  };
};

interface MaskBuilderProps {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  previewLimit?: number;
}

const formatTime = (seconds: number) => {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(2)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(2)}h`;
  const days = hours / 24;
  return `${days.toFixed(2)}d`;
};

const MaskBuilder: React.FC<MaskBuilderProps> = ({ value, onChange, previewLimit = 20 }) => {
  const analysis = useMemo(() => analyzeMask(value, previewLimit), [value, previewLimit]);
  const formattedCount = useMemo(
    () =>
      analysis.hasErrors
        ? '—'
        : new Intl.NumberFormat().format(analysis.candidateCount),
    [analysis.candidateCount, analysis.hasErrors],
  );

  const chartCount = analysis.hasErrors
    ? 0
    : Math.min(safeNumberFromBigInt(analysis.candidateCount), Number.MAX_SAFE_INTEGER);

  return (
    <div className="space-y-3">
      <label className="block mb-1">Mask</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="text-black p-1 w-full font-mono mb-2"
        placeholder="Example: ?l?u?d"
        aria-invalid={analysis.hasErrors}
      />
      <div className="flex flex-wrap gap-2 font-mono text-sm">
        {analysis.parts.length === 0 ? (
          <span className="text-gray-400">(no tokens)</span>
        ) : (
          analysis.parts.map((part, index) => (
            <span
              key={`${part.start}-${part.end}-${index}`}
              className={`px-2 py-1 rounded border ${
                part.type === 'charset'
                  ? 'bg-blue-500/20 border-blue-500'
                  : part.type === 'literal'
                  ? 'bg-gray-500/20 border-gray-500'
                  : 'bg-red-500/20 border-red-500'
              }`}
            >
              <span>{part.type === 'literal' ? part.raw : part.raw}</span>
              {part.error && (
                <span className="block text-xs text-red-200">{part.error}</span>
              )}
            </span>
          ))
        )}
      </div>
      <div className="space-x-2">
        {Object.keys(CHARSETS).map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onChange((prev) => prev + token)}
            className="px-2 py-1 bg-blue-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            {token}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange((prev) => prev + '?')}
          className="px-2 py-1 bg-gray-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
        >
          ?
        </button>
      </div>
      {value && (
        <div className="space-y-2">
          {analysis.hasErrors ? (
            <div className="text-red-400 text-sm">{analysis.errors[0]}</div>
          ) : (
            <>
              <p>Candidate space: {formattedCount}</p>
              <p className="text-sm">Estimated @1M/s: {formatTime(analysis.estimatedSeconds)}</p>
              <StatsChart count={chartCount} time={analysis.estimatedSeconds} />
            </>
          )}
          <div>
            <div className="text-sm text-gray-300">Preview</div>
            {analysis.preview.length > 0 ? (
              <pre className="bg-black text-green-400 p-2 rounded overflow-auto h-32 font-mono leading-[1.2]">
                {analysis.preview.join('\n')}
              </pre>
            ) : (
              <div className="text-xs text-gray-400">{analysis.hasErrors ? 'Fix mask errors to preview candidates.' : '(no output)'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaskBuilder;
