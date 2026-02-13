'use client';

import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type CaseMode = 'preserve' | 'lower' | 'upper';
type DedupeMode = 'caseSensitive' | 'caseInsensitive';

type WorkerProgress = {
  processed: number;
  total: number;
};

type WorkerStats = {
  totalLines: number;
  unique: number;
  duplicatesRemoved: number;
  emptyLines: number;
  caseMode: CaseMode;
  caseSensitive: boolean;
  sizeBytes: number;
};

type WorkerMessage =
  | { type: 'progress'; payload: WorkerProgress }
  | {
      type: 'complete';
      payload: {
        text: string;
        preview: string[];
        stats: WorkerStats;
      };
    }
  | { type: 'error'; payload: string }
  | { type: 'cancelled' };

type WorkerRequest = {
  type: 'process';
  payload: {
    lists: string[];
    options: {
      caseMode: CaseMode;
      dedupeCaseSensitive: boolean;
      trimWhitespace: boolean;
    };
  };
};

interface WordlistEntry {
  id: string;
  name: string;
  content: string;
  isDemo: boolean;
  totalLines: number;
  nonEmptyLines: number;
  preview: string[];
  sizeBytes: number;
}

const demoSeeds: Array<{ name: string; content: string }> = [
  {
    name: 'RockYou excerpt',
    content: ['password', '123456', 'princess', 'qwerty', 'letmein'].join('\n'),
  },
  {
    name: 'Top corporate defaults',
    content: ['Welcome1', 'Spring2024', 'Password!', 'Admin123', 'changeme'].join('\n'),
  },
  {
    name: 'Mutations sample',
    content: [
      'P@ssw0rd',
      'p@ssw0rd',
      'Password2024',
      'password2024',
      'PASSWORD2024',
    ].join('\n'),
  },
];

const generateId = () =>
  `wordlist-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const computeSizeBytes = (content: string) => {
  if (typeof Blob !== 'undefined') {
    return new Blob([content]).size;
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).length;
  }
  return content.length;
};

const analyzeContent = (content: string): { total: number; nonEmpty: number } => {
  if (!content) {
    return { total: 0, nonEmpty: 0 };
  }
  let total = 0;
  let nonEmpty = 0;
  let buffer = '';
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '\n') {
      let line = buffer;
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      total += 1;
      if (line.trim()) {
        nonEmpty += 1;
      }
      buffer = '';
      continue;
    }
    buffer += char;
  }
  if (buffer.length > 0) {
    let line = buffer;
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    total += 1;
    if (line.trim()) {
      nonEmpty += 1;
    }
  }
  return { total, nonEmpty };
};

const extractPreview = (content: string, limit = 5): string[] => {
  if (!content) return [];
  const preview: string[] = [];
  let buffer = '';
  for (let i = 0; i < content.length && preview.length < limit; i += 1) {
    const char = content[i];
    if (char === '\n') {
      let line = buffer;
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      const trimmed = line.trim();
      if (trimmed) {
        preview.push(trimmed);
      }
      buffer = '';
      continue;
    }
    buffer += char;
  }
  if (buffer.trim() && preview.length < limit) {
    let line = buffer;
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    const trimmed = line.trim();
    if (trimmed) {
      preview.push(trimmed);
    }
  }
  return preview;
};

const createEntry = (name: string, content: string, isDemo: boolean): WordlistEntry => {
  const { total, nonEmpty } = analyzeContent(content);
  return {
    id: generateId(),
    name,
    content,
    isDemo,
    totalLines: total,
    nonEmptyLines: nonEmpty,
    preview: extractPreview(content),
    sizeBytes: computeSizeBytes(content),
  };
};

const demoEntries = demoSeeds.map((seed) => createEntry(seed.name, seed.content, true));

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const WordlistTools: React.FC = () => {
  const [lists, setLists] = useState<WordlistEntry[]>(demoEntries);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    demoEntries.map((entry) => entry.id),
  );
  const [manualName, setManualName] = useState('Custom list');
  const [manualContent, setManualContent] = useState('');
  const [caseMode, setCaseMode] = useState<CaseMode>('preserve');
  const [dedupeMode, setDedupeMode] = useState<DedupeMode>('caseInsensitive');
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);
  const [resultStats, setResultStats] = useState<WorkerStats | null>(null);
  const [resultPreview, setResultPreview] = useState<string[]>([]);
  const [cleanedText, setCleanedText] = useState('');
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setStatusMessage('Web Workers are unavailable in this environment.');
      return () => undefined;
    }

    const worker = new Worker(new URL('./wordlist.worker.ts', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { type } = event.data;
      if (type === 'progress') {
        setProgress(event.data.payload);
      } else if (type === 'complete') {
        setProgress(null);
        setStatusMessage('Wordlists merged successfully.');
        setResultStats(event.data.payload.stats);
        setResultPreview(event.data.payload.preview);
        setCleanedText(event.data.payload.text);
        setError(null);
      } else if (type === 'error') {
        setProgress(null);
        setStatusMessage(null);
        setError(event.data.payload);
      } else if (type === 'cancelled') {
        setProgress(null);
        setStatusMessage('Processing cancelled.');
      }
    };
    worker.onerror = () => {
      setError('Wordlist worker encountered an error.');
      setProgress(null);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const selectedEntries = useMemo(
    () => lists.filter((entry) => selectedIds.includes(entry.id)),
    [lists, selectedIds],
  );

  const selectionSummary = useMemo(() => {
    const totalLines = selectedEntries.reduce((acc, entry) => acc + entry.totalLines, 0);
    const nonEmptyLines = selectedEntries.reduce(
      (acc, entry) => acc + entry.nonEmptyLines,
      0,
    );
    const preview: string[] = [];
    selectedEntries.forEach((entry) => {
      entry.preview.forEach((line) => {
        if (preview.length < 8 && !preview.includes(line)) {
          preview.push(line);
        }
      });
    });
    return { totalLines, nonEmptyLines, preview };
  }, [selectedEntries]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entryId) => entryId !== id) : [...prev, id],
    );
  };

  const removeList = (id: string) => {
    setLists((prev) => prev.filter((entry) => entry.id !== id));
    setSelectedIds((prev) => prev.filter((entryId) => entryId !== id));
  };

  const addManualList = () => {
    if (!manualContent.trim()) {
      setError('Provide at least one entry to add a list.');
      return;
    }
    const name = manualName.trim() || `Custom list ${lists.length + 1}`;
    const entry = createEntry(name, manualContent, false);
    setLists((prev) => [...prev, entry]);
    setSelectedIds((prev) => [...prev, entry.id]);
    setManualContent('');
    setManualName('Custom list');
    setError(null);
  };

  const onFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const entry = createEntry(file.name, reader.result, false);
        setLists((prev) => [...prev, entry]);
        setSelectedIds((prev) => [...prev, entry.id]);
        setError(null);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const startMerge = () => {
    if (!selectedEntries.length) {
      setError('Select at least one wordlist to merge.');
      return;
    }
    if (!workerRef.current) {
      setError('Wordlist worker is not available.');
      return;
    }
    setStatusMessage('Processing wordlists...');
    setError(null);
    setResultStats(null);
    setResultPreview([]);
    setCleanedText('');
    const payload: WorkerRequest = {
      type: 'process',
      payload: {
        lists: selectedEntries.map((entry) => entry.content),
        options: {
          caseMode,
          dedupeCaseSensitive: dedupeMode === 'caseSensitive',
          trimWhitespace,
        },
      },
    };
    const total = selectedEntries.reduce((acc, entry) => acc + entry.totalLines, 0);
    setProgress({ processed: 0, total });
    workerRef.current.postMessage(payload);
  };

  const cancelMerge = () => {
    workerRef.current?.postMessage({ type: 'cancel' });
  };

  const downloadResult = () => {
    if (!cleanedText) return;
    const blob = new Blob([cleanedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'wordlist-cleaned.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = useMemo(() => {
    if (!progress) return 0;
    if (progress.total === 0) return 100;
    return Math.min(100, Math.round((progress.processed / progress.total) * 100));
  }, [progress]);

  return (
    <section className="bg-gray-900 text-gray-100 rounded-lg border border-gray-700 p-4 space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Wordlist Toolkit</h2>
        <p className="text-sm text-gray-300 mt-1">
          Merge multiple lists, enforce case rules, and preview the impact before
          exporting a cleaned file. All demos stay in memory only.
        </p>
      </header>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Available lists
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    aria-label={`Select wordlist ${entry.name}`}
                    className="h-4 w-4"
                  />
                  <span>
                    {entry.name}
                    {entry.isDemo ? ' (demo)' : ''}
                  </span>
                </label>
                {!entry.isDemo && (
                  <button
                    type="button"
                    onClick={() => removeList(entry.id)}
                    className="text-xs text-red-300 hover:text-red-200"
                    aria-label={`Remove ${entry.name}`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
                <div>
                  <dt className="text-gray-400">Lines</dt>
                  <dd>{entry.totalLines.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Non-empty</dt>
                  <dd>{entry.nonEmptyLines.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Approx. size</dt>
                  <dd>{formatBytes(entry.sizeBytes)}</dd>
                </div>
              </dl>
              {entry.preview.length > 0 && (
                <div className="bg-black/40 rounded p-2 text-xs font-mono text-green-300">
                  {entry.preview.map((line) => (
                    <div key={line} className="truncate" title={line}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Add custom list
        </h3>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex flex-col text-xs text-gray-300">
            <span className="mb-1 font-semibold text-gray-200">List name</span>
            <input
              type="text"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
              placeholder="Custom list"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-300">
            <span className="mb-1 font-semibold text-gray-200">Import from file</span>
            <input
              type="file"
              accept=".txt,.lst,.wordlist"
              onChange={onFileImport}
              className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
            />
          </label>
        </div>
        <label className="flex flex-col text-xs text-gray-300">
          <span className="mb-1 font-semibold text-gray-200">Paste entries</span>
          <textarea
            value={manualContent}
            onChange={(event) => setManualContent(event.target.value)}
            rows={4}
            className="rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 font-mono"
            placeholder="One entry per line"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addManualList}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            Add list
          </button>
          <button
            type="button"
            onClick={() => {
              setManualContent('');
              setManualName('Custom list');
            }}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col text-xs text-gray-300">
          <span className="mb-1 font-semibold text-gray-200">Case handling</span>
          <select
            value={caseMode}
            onChange={(event) => setCaseMode(event.target.value as CaseMode)}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
          >
            <option value="preserve">Preserve original case</option>
            <option value="lower">Force lowercase</option>
            <option value="upper">Force uppercase</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-300">
          <span className="mb-1 font-semibold text-gray-200">Uniqueness</span>
          <select
            value={dedupeMode}
            onChange={(event) => setDedupeMode(event.target.value as DedupeMode)}
            className="rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
          >
            <option value="caseSensitive">Case-sensitive</option>
            <option value="caseInsensitive">Case-insensitive</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-300 mt-5 md:mt-auto">
          <input
            type="checkbox"
            checked={trimWhitespace}
            onChange={(event) => setTrimWhitespace(event.target.checked)}
            className="h-4 w-4"
          />
          <span>Trim whitespace before dedupe</span>
        </label>
      </div>

      <div className="bg-black/40 rounded-lg border border-gray-700 p-3 text-xs text-gray-200 space-y-1">
        <div className="flex flex-wrap gap-4">
          <span>Selected lists: {selectedEntries.length}</span>
          <span>Raw lines: {selectionSummary.totalLines.toLocaleString()}</span>
          <span>
            Non-empty: {selectionSummary.nonEmptyLines.toLocaleString()}
          </span>
        </div>
        {selectionSummary.preview.length > 0 && (
          <div className="pt-2">
            <div className="text-gray-400 uppercase text-[10px] tracking-widest">
              Preview
            </div>
            <div className="mt-1 grid gap-1 md:grid-cols-2 font-mono text-green-300">
              {selectionSummary.preview.map((line) => (
                <div key={line} className="truncate" title={line}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startMerge}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
        >
          Merge &amp; dedupe
        </button>
        <button
          type="button"
          onClick={cancelMerge}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Cancel
        </button>
        {statusMessage && <span className="text-xs text-gray-300">{statusMessage}</span>}
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>

      {progress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>Processing...</span>
            <span>
              {progress.processed.toLocaleString()} / {progress.total.toLocaleString()} lines
            </span>
          </div>
          <div className="h-2 rounded bg-gray-800">
            <div
              className="h-2 rounded bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {resultStats && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 text-xs text-gray-100 space-y-2">
          <div className="flex flex-wrap gap-4">
            <span>Unique entries: {resultStats.unique.toLocaleString()}</span>
            <span>
              Duplicates removed: {resultStats.duplicatesRemoved.toLocaleString()}
            </span>
            <span>Empty lines skipped: {resultStats.emptyLines.toLocaleString()}</span>
            <span>Output size: {formatBytes(resultStats.sizeBytes)}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-gray-300">
            <span>Case mode: {resultStats.caseMode}</span>
            <span>
              Uniqueness: {resultStats.caseSensitive ? 'case-sensitive' : 'case-insensitive'}
            </span>
          </div>
          {resultPreview.length > 0 && (
            <div>
              <div className="text-gray-400 uppercase text-[10px] tracking-widest">
                Cleaned preview
              </div>
              <div className="mt-1 bg-black/50 rounded p-2 font-mono text-green-300 max-h-48 overflow-auto">
                {resultPreview.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={downloadResult}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            Download cleaned list
          </button>
        </div>
      )}
    </section>
  );
};

export default WordlistTools;
