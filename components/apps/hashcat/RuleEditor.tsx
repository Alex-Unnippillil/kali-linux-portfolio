import React, { useEffect, useMemo } from 'react';

type RuleError = {
  line: number;
  message: string;
  rule: string;
};

type RulePreviewRecord = {
  word: string;
  outputs: string[];
};

type RuleEditorUpdate = {
  validRules: string[];
  errors: RuleError[];
  uniqueCandidateCount: number;
  preview: RulePreviewRecord[];
  truncated: boolean;
};

type RuleEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRulesUpdate?: (update: RuleEditorUpdate) => void;
  sampleWords?: string[];
  sampleLabel?: string;
  limit?: number;
};

type RuleResult = { ok: true; value: string } | { ok: false; error: string };

const defaultSampleWords = ['password', 'admin', 'letmein', 'kali2024'];

const ruleSnippets = [
  { label: 'Lowercase (l)', rule: 'l' },
  { label: 'Uppercase (u)', rule: 'u' },
  { label: 'Capitalize (c)', rule: 'c' },
  { label: 'Toggle Case (t)', rule: 't' },
  { label: 'Reverse (r)', rule: 'r' },
  { label: 'Append ! ($!)', rule: '$!' },
  { label: 'Prepend 1 (^1)', rule: '^1' },
  { label: 'Swap a→@ (sa@)', rule: 'sa@' },
  { label: 'Duplicate (d)', rule: 'd' },
];

const toggleCase = (input: string) =>
  input
    .split('')
    .map((char) => {
      const upper = char.toUpperCase();
      const lower = char.toLowerCase();
      if (char === upper && char === lower) {
        return char;
      }
      return char === upper ? lower : upper;
    })
    .join('');

const applyRule = (rule: string, word: string): RuleResult => {
  let output = word;
  for (let i = 0; i < rule.length; i += 1) {
    const command = rule[i];
    switch (command) {
      case ':':
        break;
      case 'l':
        output = output.toLowerCase();
        break;
      case 'u':
        output = output.toUpperCase();
        break;
      case 'c':
        output =
          output.charAt(0).toUpperCase() + output.slice(1).toLowerCase();
        break;
      case 't':
        output = toggleCase(output);
        break;
      case 'r':
        output = output.split('').reverse().join('');
        break;
      case 'd':
      case 'p':
        output = `${output}${output}`;
        if (output.length > 128) {
          output = output.slice(0, 128);
        }
        break;
      case '$': {
        i += 1;
        if (i >= rule.length) {
          return { ok: false, error: 'Append ($) requires a character to follow.' };
        }
        output += rule[i];
        break;
      }
      case '^': {
        i += 1;
        if (i >= rule.length) {
          return { ok: false, error: 'Prepend (^) requires a character to follow.' };
        }
        output = `${rule[i]}${output}`;
        break;
      }
      case 's': {
        if (i + 2 >= rule.length) {
          return {
            ok: false,
            error: 'Substitute (s) requires two characters to define the swap.',
          };
        }
        const from = rule[i + 1];
        const to = rule[i + 2];
        output = output.split(from).join(to);
        i += 2;
        break;
      }
      case 'q':
        output = output.slice(0, -1);
        break;
      case 'x':
        output = output.slice(1);
        break;
      default:
        return {
          ok: false,
          error: `Unknown or unsupported command "${command}" in this demo.`,
        };
    }
  }
  return { ok: true, value: output };
};

const parseRules = (value: string) => {
  const lines = value.replace(/\r/g, '').split('\n');
  const validRules: string[] = [];
  const errors: RuleError[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const result = applyRule(trimmed, 'Password');
    if (!result.ok) {
      errors.push({
        line: index + 1,
        message: result.error,
        rule: trimmed,
      });
      return;
    }
    validRules.push(trimmed);
  });

  return { validRules, errors };
};

const buildPreview = (
  rules: string[],
  sampleWords: string[],
  limit: number
): { records: RulePreviewRecord[]; uniqueCount: number; truncated: boolean } => {
  const unique = new Set<string>();
  const records: RulePreviewRecord[] = [];
  let truncated = false;

  sampleWords.slice(0, 6).forEach((word) => {
    if (truncated) {
      return;
    }
    const outputs: string[] = [];
    for (let i = 0; i < rules.length; i += 1) {
      const execution = applyRule(rules[i], word);
      if (!execution.ok) {
        continue;
      }
      const candidate = execution.value;
      unique.add(candidate);
      if (outputs.length < 5) {
        outputs.push(candidate);
      }
      if (unique.size >= limit) {
        truncated = true;
        break;
      }
    }
    records.push({ word, outputs });
  });

  return { records, uniqueCount: unique.size, truncated };
};

const RuleEditor: React.FC<RuleEditorProps> = ({
  value,
  onChange,
  onRulesUpdate,
  sampleWords = defaultSampleWords,
  sampleLabel,
  limit = 200,
}) => {
  const textareaId = 'hashcat-rule-editor';
  const { validRules, errors } = useMemo(() => parseRules(value || ''), [value]);
  const preview = useMemo(
    () => buildPreview(validRules, sampleWords, limit),
    [validRules, sampleWords, limit]
  );

  useEffect(() => {
    onRulesUpdate?.({
      validRules,
      errors,
      uniqueCandidateCount: preview.uniqueCount,
      preview: preview.records,
      truncated: preview.truncated,
    });
  }, [validRules, errors, preview, onRulesUpdate]);

  return (
      <div className="w-full max-w-xl bg-black/30 border border-ub-grey rounded p-4 mt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span
            className="font-semibold"
            id={`${textareaId}-label`}
          >
            Rule Editor
          </span>
        <div className="flex flex-wrap gap-2 text-xs">
          {ruleSnippets.map((snippet) => (
            <button
              key={snippet.label}
              type="button"
              className="px-2 py-1 bg-ub-grey text-white rounded hover:bg-ub-grey-light transition"
              onClick={() => onChange(value ? `${value}\n${snippet.rule}` : snippet.rule)}
            >
              {snippet.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        id={textareaId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={errors.length > 0}
        aria-labelledby={`${textareaId}-label`}
        aria-describedby={errors.length ? `${textareaId}-errors` : undefined}
        className={`mt-3 w-full h-32 bg-black text-green-200 font-mono text-sm p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors.length ? 'border-red-500 focus:ring-red-500' : 'border-ub-grey'
        }`}
        spellCheck={false}
        placeholder={
          '# Enter hashcat-style rules.\n' +
          '# Comments begin with # and are ignored.\n' +
          '# Example: $!\nl\n' +
          '# Supported demo commands: l, u, c, t, r, d/p, $, ^, s, :, q, x.'
        }
      />
      <div className="mt-2 text-xs text-ubt-grey">
        Supported operations are a curated subset for the demo. Complex commands
        such as bracketed position moves are intentionally omitted to avoid
        executing real cracking logic.
      </div>
      {errors.length > 0 && (
        <div
          id={`${textareaId}-errors`}
          className="mt-3 bg-red-900/50 border border-red-600 text-red-200 text-sm rounded p-2"
          role="alert"
        >
          <p className="font-semibold">Syntax issues detected:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error) => (
              <li key={`${error.line}-${error.rule}`}>
                Line {error.line}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 text-sm">
        <div className="font-semibold">
          Preview against {sampleLabel ?? 'demo wordlist'}:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {preview.records.length === 0 && (
            <div className="text-xs text-ubt-grey">
              Provide at least one rule to see transformed candidates.
            </div>
          )}
          {preview.records.map((record) => (
            <div
              key={record.word}
              className="bg-black/40 border border-ub-grey rounded p-2"
            >
              <div className="text-xs uppercase tracking-wide text-ubt-grey">
                Source
              </div>
              <div className="font-mono text-green-200">{record.word}</div>
              <div className="text-xs uppercase tracking-wide text-ubt-grey mt-2">
                Variations
              </div>
              {record.outputs.length ? (
                <ul className="mt-1 space-y-1 text-xs font-mono text-green-300">
                  {record.outputs.map((output, index) => (
                    <li key={`${record.word}-${index}`}>{output}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-ubt-grey mt-1">
                  No change for this rule set.
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-ubt-grey">
          Unique transformed candidates: {preview.uniqueCount}
          {preview.truncated && ' (preview limited to keep the demo responsive)'}
        </div>
      </div>
    </div>
  );
};

export default RuleEditor;
export type { RuleEditorUpdate, RuleError };
