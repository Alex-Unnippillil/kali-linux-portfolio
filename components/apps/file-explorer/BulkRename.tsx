import React, { useEffect, useMemo, useState } from 'react';

type RenameAction = 'dry-run' | 'apply' | null;

export interface BulkRenameItem {
  name: string;
  handle: FileSystemFileHandle;
}

export interface BulkRenamePlan {
  item: BulkRenameItem;
  nextName: string;
}

export interface BulkRenameResult {
  originalName: string;
  newName: string;
  success: boolean;
  error?: string;
  handle?: FileSystemFileHandle;
}

interface BulkRenameProps {
  items: BulkRenameItem[];
  onClose: () => void;
  onSubmit: (
    plan: BulkRenamePlan[],
    options?: { dryRun?: boolean },
  ) => Promise<BulkRenameResult[]>;
}

interface PreviewRow {
  item: BulkRenameItem;
  previewName: string;
  changed: boolean;
  error?: string;
}

interface PreviewState {
  rows: PreviewRow[];
  parseError: string | null;
}

const ESCAPE_REGEX = /[\\^$.*+?()[\]{}|]/g;

const escapeRegExp = (value: string) => value.replace(ESCAPE_REGEX, '\\$&');

const formatNumber = (value: number, padding: number) => {
  if (!Number.isFinite(value)) return '';
  const text = Math.trunc(value).toString();
  if (!padding || padding <= 0) return text;
  return text.padStart(padding, '0');
};

const splitName = (filename: string) => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return { basename: filename, extension: '' };
  }
  return {
    basename: filename.slice(0, lastDot),
    extension: filename.slice(lastDot),
  };
};

const BulkRename: React.FC<BulkRenameProps> = ({ items, onClose, onSubmit }) => {
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('{{basename}}{{ext}}');
  const [regexEnabled, setRegexEnabled] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [numberingEnabled, setNumberingEnabled] = useState(false);
  const [numberingStart, setNumberingStart] = useState(1);
  const [numberingStep, setNumberingStep] = useState(1);
  const [numberingPadding, setNumberingPadding] = useState(2);
  const [pendingAction, setPendingAction] = useState<RenameAction>(null);
  const [results, setResults] = useState<BulkRenameResult[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<RenameAction>(null);

  useEffect(() => {
    setResults(null);
    setSubmitError(null);
    setLastAction(null);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const preview = useMemo<PreviewState>(() => {
    const rows: PreviewRow[] = [];
    const duplicates = new Map<string, number>();
    let parseError: string | null = null;
    let regex: RegExp | null = null;

    const trimmedPattern = findValue.trim();
    if (trimmedPattern) {
      try {
        const source = regexEnabled ? trimmedPattern : escapeRegExp(trimmedPattern);
        const flags = caseSensitive ? 'g' : 'gi';
        regex = new RegExp(source, flags);
      } catch (error) {
        parseError = error instanceof Error ? error.message : 'Invalid pattern';
      }
    }

    items.forEach((item, index) => {
      const { basename, extension } = splitName(item.name);
      const numberingValue = numberingEnabled ? numberingStart + index * numberingStep : null;
      const paddedNumber =
        numberingEnabled && numberingValue !== null
          ? formatNumber(numberingValue, numberingPadding)
          : null;

      let replacementText = replaceValue;
      if (numberingEnabled && paddedNumber !== null) {
        replacementText = replacementText.replace(/{{n}}/gi, paddedNumber);
      }
      replacementText = replacementText
        .replace(/{{basename}}/gi, basename)
        .replace(/{{ext}}/gi, extension);

      let previewName = item.name;
      let rowError: string | undefined;

      if (parseError) {
        rowError = parseError;
      } else if (regex) {
        previewName = item.name.replace(regex, replacementText);
      } else if (replacementText) {
        previewName = replacementText;
      }

      if (!regex && !replacementText && numberingEnabled && paddedNumber !== null) {
        previewName = `${basename}${paddedNumber}${extension}`;
      }

      if (!previewName.trim()) {
        rowError = 'Resulting name is empty';
      } else if (previewName.includes('/')) {
        rowError = 'Name cannot contain /';
      }

      const changed = previewName !== item.name;
      if (previewName) {
        duplicates.set(previewName, (duplicates.get(previewName) || 0) + 1);
      }

      rows.push({ item, previewName, changed, error: rowError });
    });

    rows.forEach((row) => {
      if (!row.error) {
        const count = duplicates.get(row.previewName) ?? 0;
        if (count > 1) {
          row.error = 'Duplicate target name';
        }
      }
    });

    return { rows, parseError };
  }, [
    items,
    findValue,
    replaceValue,
    regexEnabled,
    caseSensitive,
    numberingEnabled,
    numberingStart,
    numberingStep,
    numberingPadding,
  ]);

  const actionableRows = useMemo(
    () => preview.rows.filter((row) => row.changed && !row.error),
    [preview.rows],
  );

  const hasPreviewErrors = preview.rows.some((row) => row.error);
  const canSubmit = actionableRows.length > 0 && !hasPreviewErrors;

  const resultMap = useMemo(() => {
    const map = new Map<string, BulkRenameResult>();
    results?.forEach((result) => {
      map.set(result.originalName, result);
    });
    return map;
  }, [results]);

  const runSubmit = async (dryRun: boolean) => {
    if (!actionableRows.length) return;
    setPendingAction(dryRun ? 'dry-run' : 'apply');
    setSubmitError(null);
    setLastAction(dryRun ? 'dry-run' : 'apply');
    try {
      const payload = actionableRows.map(({ item, previewName }) => ({ item, nextName: previewName }));
      const submitResults = await onSubmit(payload, { dryRun });
      setResults(submitResults);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to process rename request.',
      );
    } finally {
      setPendingAction(null);
    }
  };

  const dryRun = () => runSubmit(true);
  const apply = () => runSubmit(false);

  return (
    <div className="w-[min(720px,100%)] max-h-[85vh] overflow-hidden rounded bg-ub-darkest text-white shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-lg font-semibold">Bulk Rename</h2>
        <button
          onClick={onClose}
          className="rounded bg-black/40 px-3 py-1 text-sm hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Close
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-auto px-4 py-4 text-sm">
        <p className="text-xs text-gray-200">
          Build rename rules with regular expressions, numbering, and placeholders. Use{' '}
          <code className="rounded bg-black/60 px-1">{'{{n}}'}</code> for numbering,
          <code className="ml-1 rounded bg-black/60 px-1">{'{{basename}}'}</code> for the
          filename without the extension, and{' '}
          <code className="ml-1 rounded bg-black/60 px-1">{'{{ext}}'}</code> for the file
          extension. Capture groups such as <code className="rounded bg-black/60 px-1">$1</code>
          are supported when regex is enabled.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-300">Find</span>
            <input
              id="bulk-rename-find"
              value={findValue}
              onChange={(event) => setFindValue(event.target.value)}
              placeholder="Regex or text to find"
              className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              aria-label="Find pattern"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-300">Replace</span>
            <input
              id="bulk-rename-replace"
              value={replaceValue}
              onChange={(event) => setReplaceValue(event.target.value)}
              placeholder="Replacement pattern"
              className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              aria-label="Replacement pattern"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-200">
            <input
              type="checkbox"
              checked={regexEnabled}
              onChange={(event) => setRegexEnabled(event.target.checked)}
              aria-label="Use regular expression matching"
            />
            Use regular expression matching
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-200">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(event) => setCaseSensitive(event.target.checked)}
              aria-label="Case sensitive search"
            />
            Case sensitive
          </label>
        </div>
        <div className="rounded border border-white/10 bg-black/30 p-3">
          <label className="flex items-center gap-2 text-xs text-gray-200">
            <input
              type="checkbox"
              checked={numberingEnabled}
              onChange={(event) => setNumberingEnabled(event.target.checked)}
              aria-label="Enable numbering"
            />
            Enable numbering
          </label>
          {numberingEnabled && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-gray-300">
                <span>Start</span>
                <input
                  type="number"
                  value={numberingStart}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setNumberingStart(Number.isFinite(value) ? value : 1);
                  }}
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                  aria-label="Numbering start"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-300">
                <span>Step</span>
                <input
                  type="number"
                  value={numberingStep}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setNumberingStep(Number.isFinite(value) && value !== 0 ? value : 1);
                  }}
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                  aria-label="Numbering step"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-300">
                <span>Padding</span>
                <input
                  type="number"
                  min={0}
                  value={numberingPadding}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setNumberingPadding(Number.isFinite(value) && value >= 0 ? value : 0);
                  }}
                  className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                  aria-label="Numbering padding"
                />
              </label>
            </div>
          )}
        </div>
        {submitError && <div className="rounded border border-red-500/40 bg-red-900/40 p-2 text-xs">{submitError}</div>}
        <div className="overflow-auto rounded border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/40 text-gray-200">
              <tr>
                <th className="px-3 py-2 font-semibold">Original</th>
                <th className="px-3 py-2 font-semibold">Preview</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-gray-300">
                    Select files in the explorer to start a bulk rename.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const row = preview.rows.find((candidate) => candidate.item === item);
                const result = resultMap.get(item.name);
                const previewName = row?.previewName ?? item.name;
                const status = (() => {
                  if (!row) return 'Pending';
                  if (row.error) return row.error;
                  if (!row.changed) return 'Unchanged';
                  if (result) {
                    if (!result.success) return result.error ?? 'Failed';
                    if (lastAction === 'dry-run') return 'Dry run passed';
                    return 'Renamed';
                  }
                  return 'Pending';
                })();
                const statusClass =
                  row?.error || (result && !result.success)
                    ? 'text-red-300'
                    : result && result.success
                    ? 'text-green-300'
                    : 'text-gray-200';

                return (
                  <tr key={item.name} className="odd:bg-black/20">
                    <td className="px-3 py-2 font-mono text-xs">{item.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{previewName}</td>
                    <td className={`px-3 py-2 text-xs ${statusClass}`}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-gray-300">
            {actionableRows.length} item{actionableRows.length === 1 ? '' : 's'} ready.{' '}
            {hasPreviewErrors && <span className="text-red-300">Resolve preview errors before applying.</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={dryRun}
              disabled={!actionableRows.length || pendingAction !== null}
              className={`rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                !actionableRows.length || pendingAction !== null
                  ? 'cursor-not-allowed bg-black/30 text-gray-500'
                  : 'bg-black/40 hover:bg-black/60'
              }`}
            >
              {pendingAction === 'dry-run' ? 'Checking…' : 'Dry Run'}
            </button>
            <button
              onClick={apply}
              disabled={!canSubmit || pendingAction !== null}
              className={`rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                !canSubmit || pendingAction !== null
                  ? 'cursor-not-allowed bg-green-900/40 text-green-900'
                  : 'bg-green-600/80 hover:bg-green-500'
              }`}
            >
              {pendingAction === 'apply' ? 'Renaming…' : 'Apply Renames'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkRename;
