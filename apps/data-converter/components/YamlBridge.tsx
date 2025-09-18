'use client';

import { useMemo, useState } from 'react';
import { diffLines, type Change } from 'diff';
import { Document, parseDocument } from 'yaml';

export interface ConversionResult<TValue = unknown> {
  doc: Document.Parsed<TValue>;
  output: string;
  value: TValue;
}

const mapLikeToObject = (value: unknown): unknown => {
  if (value instanceof Map) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of value.entries()) {
      const stringKey = typeof key === 'string' ? key : String(key);
      result[stringKey] = mapLikeToObject(val);
    }
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => mapLikeToObject(item));
  }

  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = mapLikeToObject(val);
      }
      return result;
    }
  }

  return value;
};

export const convertJsonToYaml = (jsonText: string): ConversionResult<unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }

  const doc = new Document();
  doc.contents = doc.createNode(parsed, { keepUndefined: false });
  return {
    doc,
    output: doc.toString(),
    value: parsed,
  };
};

export const convertYamlToJson = (yamlText: string): ConversionResult<unknown> => {
  const doc = parseDocument(yamlText, { keepSourceTokens: true });

  if (doc.errors.length) {
    const [firstError] = doc.errors;
    throw new Error(`Invalid YAML: ${firstError.message}`);
  }

  const value = doc.toJS({ mapAsMap: true });
  const normalized = mapLikeToObject(value);

  return {
    doc,
    output: JSON.stringify(normalized, null, 2),
    value: normalized,
  };
};

export const canonicalizeJson = (jsonText: string): string => {
  const { output } = convertJsonToYaml(jsonText);
  const roundTrip = convertYamlToJson(output);
  return roundTrip.output;
};

export const canonicalizeYaml = (yamlText: string): string => {
  const { doc } = convertYamlToJson(yamlText);
  return doc.toString();
};

const DEFAULT_JSON = `{
  "service": "demo",
  "metadata": {
    "owner": "ops",
    "tier": "gold"
  },
  "env": [
    { "name": "HOST", "value": "localhost" },
    { "name": "PORT", "value": 8080 }
  ]
}`;

const DEFAULT_YAML = convertJsonToYaml(DEFAULT_JSON).output;

const DiffViewer = ({ diff }: { diff: Change[] }) => {
  const hasChanges = useMemo(
    () => diff.some((part) => part.added || part.removed),
    [diff],
  );

  return (
    <div className="space-y-2">
      <pre className="whitespace-pre-wrap rounded bg-gray-800 p-3 text-sm overflow-auto">
        {diff.map((part, idx) => (
          <span
            key={idx}
            className={
              part.added
                ? 'bg-green-900/60'
                : part.removed
                  ? 'bg-red-900/70 line-through'
                  : ''
            }
          >
            {part.value}
          </span>
        ))}
      </pre>
      {!hasChanges && <p className="text-xs text-gray-400">No differences detected.</p>}
    </div>
  );
};

const buttonBase =
  'rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-gray-600';

const secondaryButton =
  'rounded bg-gray-700 px-3 py-1 text-sm font-medium text-white transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-gray-600';

const YamlBridge = () => {
  const [jsonText, setJsonText] = useState(DEFAULT_JSON);
  const [yamlText, setYamlText] = useState(DEFAULT_YAML);
  const [diff, setDiff] = useState<Change[] | null>(null);
  const [diffLabel, setDiffLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateYaml = (commit: boolean) => {
    try {
      const { output } = convertJsonToYaml(jsonText);
      let baseline = yamlText;
      try {
        baseline = canonicalizeYaml(yamlText);
      } catch (err) {
        if (!commit) {
          throw err;
        }
      }

      setDiff(diffLines(baseline, output));
      setDiffLabel(commit ? 'YAML diff (after converting JSON → YAML)' : 'YAML diff preview');
      setError(null);
      if (commit) {
        setYamlText(output);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateJson = (commit: boolean) => {
    try {
      const { output } = convertYamlToJson(yamlText);
      let baseline = jsonText;
      try {
        baseline = canonicalizeJson(jsonText);
      } catch (err) {
        if (!commit) {
          throw err;
        }
      }

      setDiff(diffLines(baseline, output));
      setDiffLabel(commit ? 'JSON diff (after converting YAML → JSON)' : 'JSON diff preview');
      setError(null);
      if (commit) {
        setJsonText(output);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-ub-cool-grey p-4 text-white">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Data Converter</h1>
        <p className="text-sm text-gray-300">
          Convert JSON and YAML using yaml&apos;s Document API. Order of keys is preserved whenever possible so round-trips stay predictable.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">JSON</span>
          <textarea
            className="min-h-[200px] flex-1 rounded bg-gray-900 p-3 font-mono text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">YAML</span>
          <textarea
            className="min-h-[200px] flex-1 rounded bg-gray-900 p-3 font-mono text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={yamlText}
            onChange={(event) => setYamlText(event.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label="Convert JSON to YAML"
          className={buttonBase}
          onClick={() => updateYaml(true)}
        >
          Convert JSON → YAML
        </button>
        <button
          type="button"
          aria-label="Diff JSON to YAML"
          className={secondaryButton}
          onClick={() => updateYaml(false)}
        >
          Diff JSON → YAML
        </button>
        <button
          type="button"
          aria-label="Convert YAML to JSON"
          className={buttonBase}
          onClick={() => updateJson(true)}
        >
          Convert YAML → JSON
        </button>
        <button
          type="button"
          aria-label="Diff YAML to JSON"
          className={secondaryButton}
          onClick={() => updateJson(false)}
        >
          Diff YAML → JSON
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {diff && diffLabel && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{diffLabel}</h2>
          <DiffViewer diff={diff} />
        </section>
      )}
    </div>
  );
};

export default YamlBridge;
