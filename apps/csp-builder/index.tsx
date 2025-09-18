'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import {
  CSP_PRESETS,
  PRESET_LIST,
  type CspDirectiveDefinition,
  type CspPreset,
  type CspPresetId,
} from '../../components/apps/csp-builder/presets';
import { logEvent } from '../../utils/analytics';

type DirectiveField = 'name' | 'value';

interface DirectiveEntry extends CspDirectiveDefinition {
  id: string;
}

interface DiffEntry {
  name: string;
  previous?: string;
  next?: string;
}

interface DiffSummary {
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];
}

interface PresetTransition {
  previousPresetId: CspPresetId | null;
  nextPresetId: CspPresetId;
  diff: DiffSummary;
  summary: string;
  notes: string[];
  hasChanges: boolean;
  clearedViolations: boolean;
}

interface ViolationEntry {
  id: string;
  directive?: string;
  blockedUri?: string;
  documentUri?: string;
  lineNumber?: number;
  columnNumber?: number;
  raw: string;
}

const initialPresetId: CspPresetId = 'balanced';

const createId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const createDirectiveEntries = (preset: CspPreset): DirectiveEntry[] =>
  preset.directives.map((definition) => ({
    id: createId(),
    name: definition.name,
    value: definition.value,
    description: definition.description,
  }));

const diffDirectives = (previous: DirectiveEntry[], next: DirectiveEntry[]): DiffSummary => {
  const previousMap = new Map<string, string>();
  previous.forEach((directive) => {
    const key = directive.name.trim() || '[custom]';
    previousMap.set(key, directive.value.trim());
  });

  const nextMap = new Map<string, string>();
  next.forEach((directive) => {
    const key = directive.name.trim() || '[custom]';
    nextMap.set(key, directive.value.trim());
  });

  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const changed: DiffEntry[] = [];

  nextMap.forEach((value, key) => {
    if (!previousMap.has(key)) {
      added.push({ name: key, next: value });
      return;
    }
    const previousValue = previousMap.get(key);
    if (previousValue !== value) {
      changed.push({ name: key, previous: previousValue, next: value });
    }
  });

  previousMap.forEach((value, key) => {
    if (!nextMap.has(key)) {
      removed.push({ name: key, previous: value });
    }
  });

  return { added, removed, changed };
};

const getPresetTitle = (id: CspPresetId | null): string => {
  if (!id) {
    return 'Custom configuration';
  }
  const preset = CSP_PRESETS[id];
  return preset?.title ?? 'Custom configuration';
};

const formatDiffEntry = (entry: DiffEntry): string => {
  if (entry.previous && entry.next) {
    return `${entry.name}: ${entry.previous} → ${entry.next}`;
  }
  if (entry.next) {
    return `${entry.name}: ${entry.next}`;
  }
  if (entry.previous) {
    return `${entry.name}: ${entry.previous}`;
  }
  return entry.name;
};

const parseViolationInput = (raw: string): Omit<ViolationEntry, 'id'> => {
  try {
    const payload = JSON.parse(raw);
    const directive =
      payload.effectiveDirective ||
      payload.violatedDirective ||
      payload['csp-directive'];
    return {
      directive,
      blockedUri: payload.blockedURI || payload.blockedUri,
      documentUri: payload.documentURI || payload.documentUri,
      lineNumber: typeof payload.lineNumber === 'number' ? payload.lineNumber : undefined,
      columnNumber: typeof payload.columnNumber === 'number' ? payload.columnNumber : undefined,
      raw,
    };
  } catch {
    return { raw };
  }
};

const CspBuilder = () => {
  const [directives, setDirectives] = useState<DirectiveEntry[]>(() =>
    createDirectiveEntries(CSP_PRESETS[initialPresetId]),
  );
  const [selectedPresetId, setSelectedPresetId] = useState<CspPresetId>(initialPresetId);
  const [transition, setTransition] = useState<PresetTransition | null>(null);
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [violationInput, setViolationInput] = useState('');

  const policy = useMemo(() => {
    const lines = directives
      .map((directive) => {
        const name = directive.name.trim();
        const value = directive.value.trim();
        if (!name) {
          return '';
        }
        return value ? `${name} ${value};` : `${name};`;
      })
      .filter(Boolean);
    return lines.join('\n');
  }, [directives]);

  const activePreset = CSP_PRESETS[selectedPresetId];

  const updateDirective = (id: string, field: DirectiveField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDirectives((current) =>
        current.map((directive) =>
          directive.id === id ? { ...directive, [field]: value } : directive,
        ),
      );
    };

  const removeDirective = (id: string) => {
    setDirectives((current) => current.filter((directive) => directive.id !== id));
  };

  const addDirective = () => {
    setDirectives((current) => [
      ...current,
      {
        id: createId(),
        name: '',
        value: '',
        description: 'Custom directive added manually for fine-grained tuning.',
      },
    ]);
  };

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value as CspPresetId;
    const nextPreset = CSP_PRESETS[nextId];
    if (!nextPreset) {
      return;
    }

    const previousPresetId = selectedPresetId ?? null;
    const nextDirectives = createDirectiveEntries(nextPreset);
    const diff = diffDirectives(directives, nextDirectives);
    const hasChanges = Boolean(
      diff.added.length || diff.removed.length || diff.changed.length,
    );
    const hadViolations = violations.length > 0;

    setDirectives(nextDirectives);
    setSelectedPresetId(nextId);
    setViolations([]);
    setViolationInput('');
    setTransition({
      previousPresetId,
      nextPresetId: nextId,
      diff,
      summary: nextPreset.summary,
      notes: nextPreset.notes,
      hasChanges,
      clearedViolations: hadViolations,
    });

    logEvent({ category: 'csp-builder', action: 'apply-preset', label: nextId });
  };

  const addViolation = () => {
    const raw = violationInput.trim();
    if (!raw) {
      return;
    }

    const entry = parseViolationInput(raw);
    setViolations((current) => [
      {
        id: createId(),
        ...entry,
      },
      ...current,
    ]);
    setViolationInput('');
  };

  const clearViolations = () => {
    setViolations([]);
    setViolationInput('');
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Content Security Policy Builder</h1>
          <p className="mt-2 text-sm text-gray-300">
            Compose CSP directives, compare opinionated presets, and track sample violation reports
            without touching production headers.
          </p>
        </header>

        <section className="space-y-3 rounded border border-gray-700 bg-gray-800 p-4">
          <label className="block text-sm font-medium" htmlFor="csp-preset">
            Preset profile
          </label>
          <select
            id="csp-preset"
            value={selectedPresetId}
            onChange={handlePresetChange}
            className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm"
          >
            {PRESET_LIST.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title}
              </option>
            ))}
          </select>
          <div className="rounded border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">
            <p className="font-medium text-white">{activePreset.summary}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {activePreset.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </section>

        {transition && (
          <section className="space-y-3 rounded border border-blue-500 bg-blue-900/40 p-4 text-sm">
            <div>
              <h2 className="text-base font-semibold text-blue-200">Preset diff summary</h2>
              <p className="mt-1 text-blue-100">
                Switched from <span className="font-medium">{getPresetTitle(transition.previousPresetId)}</span>{' '}
                to <span className="font-medium">{getPresetTitle(transition.nextPresetId)}</span>.
              </p>
            </div>

            {transition.hasChanges ? (
              <div className="space-y-2">
                {transition.diff.added.length > 0 && (
                  <div>
                    <h3 className="font-medium text-blue-100">Added directives</h3>
                    <ul className="list-disc space-y-1 pl-5 text-blue-100">
                      {transition.diff.added.map((entry) => (
                        <li key={`added-${entry.name}`}>{formatDiffEntry(entry)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {transition.diff.changed.length > 0 && (
                  <div>
                    <h3 className="font-medium text-blue-100">Updated directives</h3>
                    <ul className="list-disc space-y-1 pl-5 text-blue-100">
                      {transition.diff.changed.map((entry) => (
                        <li key={`changed-${entry.name}`}>{formatDiffEntry(entry)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {transition.diff.removed.length > 0 && (
                  <div>
                    <h3 className="font-medium text-blue-100">Removed directives</h3>
                    <ul className="list-disc space-y-1 pl-5 text-blue-100">
                      {transition.diff.removed.map((entry) => (
                        <li key={`removed-${entry.name}`}>{formatDiffEntry(entry)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-blue-100">
                The selected preset matches the current directive list—no policy changes were required.
              </p>
            )}

            <div className="rounded border border-blue-400/60 bg-blue-900/30 p-3 text-blue-100">
              <p className="font-medium">{transition.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {transition.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              {transition.clearedViolations && (
                <p className="mt-2 text-xs text-blue-200">
                  Previous violation entries were cleared to avoid cross-preset confusion.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Directive editor</h2>
            <button
              type="button"
              onClick={addDirective}
              className="rounded bg-ub-green px-3 py-1 text-sm font-medium text-black hover:bg-ub-light-green"
            >
              Add directive
            </button>
          </div>
          <div className="space-y-4">
            {directives.map((directive) => {
              const nameInputId = `${directive.id}-name`;
              const sourcesInputId = `${directive.id}-sources`;

              return (
                <div
                  key={directive.id}
                  className="space-y-3 rounded border border-gray-700 bg-gray-800 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm font-medium" htmlFor={nameInputId}>
                      <span>Directive</span>
                      <input
                        id={nameInputId}
                        className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm"
                        value={directive.name}
                        onChange={updateDirective(directive.id, 'name')}
                        placeholder="default-src"
                        aria-label="Directive name"
                      />
                    </label>
                    <label className="block text-sm font-medium" htmlFor={sourcesInputId}>
                      <span>Sources</span>
                      <input
                        id={sourcesInputId}
                        className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm"
                        value={directive.value}
                        onChange={updateDirective(directive.id, 'value')}
                        placeholder="'self' https://cdn.example.com"
                        aria-label="Directive sources"
                      />
                    </label>
                  </div>
                  {directive.description && (
                    <p className="text-xs text-gray-300">{directive.description}</p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeDirective(directive.id)}
                      className="rounded border border-red-500 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Policy preview</h2>
          <pre className="max-h-64 overflow-auto rounded border border-gray-700 bg-black p-4 text-sm text-green-300">
            {policy || '# Add directives to generate a Content-Security-Policy header'}
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Violation log</h2>
          <p className="text-sm text-gray-300">
            Paste JSON from a <code className="font-mono">SecurityPolicyViolationEvent</code> or Reporting API payload to
            capture how the policy behaves. Logs are cleared automatically whenever a preset is applied.
          </p>
          <label className="block text-sm font-medium" htmlFor="violation-log-input">
            Violation payload
          </label>
          <textarea
            id="violation-log-input"
            value={violationInput}
            onChange={(event) => setViolationInput(event.target.value)}
            className="min-h-[120px] w-full rounded border border-gray-600 bg-gray-900 p-2 text-sm"
            placeholder='{"effectiveDirective":"img-src","blockedURI":"https://cdn.example.com/logo.png"}'
            aria-label="Violation payload"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addViolation}
              className="rounded bg-ub-green px-3 py-1 text-sm font-semibold text-black hover:bg-ub-light-green"
            >
              Log violation
            </button>
            <button
              type="button"
              onClick={clearViolations}
              className="rounded border border-gray-500 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
            >
              Clear log
            </button>
          </div>
          {violations.length === 0 ? (
            <p className="text-sm text-gray-400">No violation entries recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {violations.map((violation) => (
                <li
                  key={violation.id}
                  className="rounded border border-gray-700 bg-gray-800 p-3 text-sm"
                >
                  <p className="font-medium text-white">
                    {violation.directive || 'Unknown directive'}
                  </p>
                  <p className="text-xs text-gray-300">
                    Blocked: {violation.blockedUri || 'N/A'}
                    {violation.documentUri ? ` · Document: ${violation.documentUri}` : ''}
                    {typeof violation.lineNumber === 'number'
                      ? ` · Line ${violation.lineNumber}${
                          typeof violation.columnNumber === 'number'
                            ? `:${violation.columnNumber}`
                            : ''
                        }`
                      : ''}
                  </p>
                  <pre className="mt-2 overflow-auto rounded bg-black/60 p-2 text-xs text-green-300">
                    {violation.raw}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default CspBuilder;
