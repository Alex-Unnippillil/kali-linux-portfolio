'use client';

import React, { useCallback, useMemo, useState } from 'react';

import usePersistentState from '../../../hooks/usePersistentState';

interface SampleFilter {
  id: string;
  name: string;
  code: string;
}

interface ParsedCommand {
  type: 'drop' | 'replace';
  pattern: string;
  replacement?: string;
}

interface ParseError {
  line: number;
  message: string;
}

const DEFAULT_SAMPLES: SampleFilter[] = [
  { id: 'drop-dns', name: 'Drop DNS', code: 'drop DNS' },
  { id: 'replace-example', name: 'Replace example.com', code: 'replace example.com test.com' },
];

const EXAMPLE_PACKETS = [
  'DNS query example.com',
  'HTTP GET /index.html',
  'SSH handshake from 10.0.0.1',
  'HTTP GET /admin',
];

const createSampleId = (name: string, existing: SampleFilter[]) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const suffix = existing.length + 1;
  return `${base || 'sample'}-${suffix}`;
};

const parseFilterText = (text: string) => {
  const commands: ParsedCommand[] = [];
  const errors: ParseError[] = [];

  text.split(/\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [command, ...rest] = trimmed.split(/\s+/);
    if (command === 'drop') {
      if (rest.length === 0) {
        errors.push({ line: index + 1, message: 'drop requires a pattern string.' });
        return;
      }
      commands.push({ type: 'drop', pattern: rest.join(' ') });
      return;
    }
    if (command === 'replace') {
      if (rest.length < 2) {
        errors.push({ line: index + 1, message: 'replace requires a pattern and replacement.' });
        return;
      }
      const [pattern, ...replacementParts] = rest;
      commands.push({ type: 'replace', pattern, replacement: replacementParts.join(' ') });
      return;
    }
    errors.push({ line: index + 1, message: `Unknown command "${command}".` });
  });

  return { commands, errors };
};

const applyCommands = (packets: string[], commands: ParsedCommand[]) => {
  return commands.reduce((result, command) => {
    if (command.type === 'drop') {
      return result.filter((packet) => !packet.includes(command.pattern));
    }
    if (command.type === 'replace' && command.replacement !== undefined) {
      return result.map((packet) => packet.split(command.pattern).join(command.replacement ?? ''));
    }
    return result;
  }, packets);
};

export default function FilterEditor() {
  const [samples, setSamples] = usePersistentState<SampleFilter[]>(
    'ettercap-samples',
    DEFAULT_SAMPLES,
  );
  const [selectedId, setSelectedId] = usePersistentState<string>(
    'ettercap-samples-selected',
    DEFAULT_SAMPLES[0].id,
  );
  const [filterText, setFilterText] = usePersistentState(
    'ettercap-filter-text',
    DEFAULT_SAMPLES[0].code,
  );

  const [sampleName, setSampleName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [importError, setImportError] = useState('');

  const selectedSample = samples.find((sample) => sample.id === selectedId) ?? samples[0];

  const { commands, errors } = useMemo(() => parseFilterText(filterText), [filterText]);
  const output = useMemo(
    () => applyCommands(EXAMPLE_PACKETS, commands),
    [commands],
  );

  const saveToSelected = useCallback(() => {
    if (!selectedSample) return;
    setSamples((current) =>
      current.map((sample) =>
        sample.id === selectedSample.id ? { ...sample, code: filterText } : sample,
      ),
    );
  }, [filterText, selectedSample, setSamples]);

  const createSample = useCallback(() => {
    const name = sampleName.trim();
    if (!name) return;
    const id = createSampleId(name, samples);
    setSamples((current) => [...current, { id, name, code: filterText }]);
    setSelectedId(id);
    setSampleName('');
  }, [filterText, sampleName, samples, setSamples, setSelectedId]);

  const handleRename = useCallback(() => {
    const name = renameValue.trim();
    if (!selectedSample || !name) return;
    setSamples((current) =>
      current.map((sample) =>
        sample.id === selectedSample.id ? { ...sample, name } : sample,
      ),
    );
    setIsRenaming(false);
    setRenameValue('');
  }, [renameValue, selectedSample, setSamples]);

  const deleteSample = useCallback(() => {
    if (!selectedSample) return;
    setSamples((current) => current.filter((sample) => sample.id !== selectedSample.id));
    const remaining = samples.filter((sample) => sample.id !== selectedSample.id);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
      setFilterText(remaining[0].code);
    }
  }, [samples, selectedSample, setFilterText, setSamples, setSelectedId]);

  const exportSamples = useCallback(() => {
    const payload = JSON.stringify({ samples }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ettercap-filter-samples.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [samples]);

  const importSamples = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setImportError('');
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed?.samples || !Array.isArray(parsed.samples)) {
          throw new Error('Missing samples array.');
        }
        const incoming = parsed.samples
          .filter((sample: SampleFilter) => sample.name && sample.code)
          .map((sample: SampleFilter, index: number) => ({
            ...sample,
            id: sample.id || createSampleId(sample.name, [...samples, { id: `${index}`, name: '', code: '' }]),
          }));
        if (incoming.length === 0) {
          throw new Error('No valid samples found.');
        }
        setSamples((current) => [...current, ...incoming]);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import samples.');
      }
    },
    [samples, setSamples],
  );

  const selectSample = useCallback(
    (id: string) => {
      const sample = samples.find((item) => item.id === id);
      if (!sample) return;
      setSelectedId(id);
      setFilterText(sample.code);
    },
    [samples, setFilterText, setSelectedId],
  );

  return (
    <section className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-4">
      <header className="space-y-2">
        <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">Filter editor</h3>
        <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
          Draft safe filters using drop/replace commands. Validation runs locally with deterministic fixtures.
        </p>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
            Selected sample
            <select
              className="mt-2 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] px-3 py-2 text-sm text-[color:var(--kali-text)]"
              value={selectedSample?.id}
              onChange={(event) => selectSample(event.target.value)}
            >
              {samples.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-[color:var(--color-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_90%,var(--kali-panel))]"
              onClick={saveToSelected}
            >
              Save to sample
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
              onClick={() => {
                setIsRenaming((value) => !value);
                setRenameValue(selectedSample?.name ?? '');
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-danger)_55%,transparent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-danger)_80%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-danger)_15%,transparent)]"
              onClick={deleteSample}
              disabled={samples.length <= 1}
            >
              Delete
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
              onClick={exportSamples}
            >
              Export JSON
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]">
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                aria-label="Import filter samples"
                onChange={(event) => importSamples(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {isRenaming && (
            <div className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                Rename sample
                <input
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  aria-label="Rename sample"
                  className="mt-2 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--kali-text)]"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded bg-[color:var(--color-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)]"
                  onClick={handleRename}
                >
                  Save name
                </button>
                <button
                  type="button"
                  className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]"
                  onClick={() => setIsRenaming(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
              Create new sample
              <input
                type="text"
                value={sampleName}
                onChange={(event) => setSampleName(event.target.value)}
                aria-label="Create new sample"
                className="mt-2 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--kali-text)]"
                placeholder="Enter sample name"
              />
            </label>
            <button
              type="button"
              className="mt-3 rounded bg-[color:var(--color-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)]"
              onClick={createSample}
            >
              Create sample
            </button>
          </div>

          {importError && (
            <p className="text-xs text-[color:color-mix(in_srgb,var(--color-danger)_80%,var(--kali-text))]">
              {importError}
            </p>
          )}

          <label className="block text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
            Filter text
            <textarea
              className="mt-2 h-40 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-3 font-mono text-xs text-[color:var(--kali-text)]"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              aria-label="Filter source"
            />
          </label>

          {errors.length > 0 && (
            <div className="rounded border border-[color:color-mix(in_srgb,var(--color-danger)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_12%,var(--kali-panel))] p-3 text-xs text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))]">
              <p className="font-semibold uppercase tracking-wide">Validation errors</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {errors.map((error) => (
                  <li key={`${error.line}-${error.message}`}>
                    Line {error.line}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
              Before
            </h4>
            <ul className="mt-2 space-y-1 font-mono text-xs text-[color:var(--kali-text)]">
              {EXAMPLE_PACKETS.map((packet) => (
                <li key={packet}>{packet}</li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
              After
            </h4>
            <ul className="mt-2 space-y-1 font-mono text-xs text-[color:var(--kali-text)]">
              {output.length === 0 ? (
                <li className="text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
                  All packets dropped by the current filter.
                </li>
              ) : (
                output.map((packet) => <li key={packet}>{packet}</li>)
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
