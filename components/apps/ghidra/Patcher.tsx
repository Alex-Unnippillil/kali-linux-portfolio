'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

type Checksums = Record<string, string>;

type PatchDiff = {
  offset: number;
  original: number;
  value: number;
};

type PatchSnapshot = {
  id: string;
  name: string;
  createdAt: number;
  baseHex: string;
  currentHex: string;
  fileName?: string;
  byteLength: number;
};

const HISTORY_LIMIT = 100;
const BYTES_PER_ROW = 16;
const MAX_BYTES = 4096;
const DEFAULT_SAMPLE = new Uint8Array([
  0x55, 0x48, 0x89, 0xe5, 0x48, 0x83, 0xec, 0x20,
  0x89, 0x7d, 0xec, 0x48, 0x89, 0x75, 0xf0, 0x8b,
  0x55, 0xec, 0x48, 0x8b, 0x45, 0xf0, 0x48, 0x01,
  0xd0, 0x88, 0x10, 0x48, 0x8b, 0x45, 0xf0, 0x48,
  0x8d, 0x50, 0x01, 0x48, 0x89, 0x55, 0xf0, 0x48,
  0x8b, 0x45, 0xf0, 0x0f, 0xb6, 0x08, 0x3c, 0x00,
  0x75, 0xe3, 0x48, 0x83, 0xc4, 0x20, 0x5d, 0xc3,
]);

const DEFAULT_META = {
  name: 'demo.bin',
  size: DEFAULT_SAMPLE.length,
  originalSize: DEFAULT_SAMPLE.length,
  truncated: false,
  source: 'demo' as const,
};

const hexifyByte = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string) => {
  const sanitized = hex.replace(/[^0-9a-f]/gi, '');
  const output = new Uint8Array(Math.floor(sanitized.length / 2));
  for (let i = 0; i < output.length; i += 1) {
    output[i] = parseInt(sanitized.substr(i * 2, 2), 16);
  }
  return output;
};

const isPatchSnapshot = (value: unknown): value is PatchSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as PatchSnapshot;
  return (
    typeof snapshot.id === 'string' &&
    typeof snapshot.name === 'string' &&
    typeof snapshot.createdAt === 'number' &&
    typeof snapshot.baseHex === 'string' &&
    typeof snapshot.currentHex === 'string' &&
    typeof snapshot.byteLength === 'number'
  );
};

const isSnapshotArray = (value: unknown): value is PatchSnapshot[] =>
  Array.isArray(value) && value.every(isPatchSnapshot);

const computeChecksums = async (bytes: Uint8Array): Promise<Checksums> => {
  const result: Checksums = {};
  const sum = bytes.reduce((acc, b) => (acc + b) >>> 0, 0);
  result['SUM-32'] = sum.toString(16).padStart(8, '0');
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return result;
  }
  const algorithms: AlgorithmIdentifier[] = ['SHA-256', 'SHA-1'];
  await Promise.all(
    algorithms.map(async (algo) => {
      try {
        const digest = await window.crypto.subtle.digest(algo, bytes);
        result[algo] = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        // ignore digest errors and keep fallback checksum
      }
    }),
  );
  return result;
};

const ChecksumList: React.FC<{ title: string; checksums: Checksums }> = ({
  title,
  checksums,
}) => (
  <div>
    <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
    {Object.keys(checksums).length === 0 ? (
      <p className="text-xs text-gray-400">Unavailable in this environment.</p>
    ) : (
      <ul className="mt-1 space-y-1 text-xs font-mono text-gray-300">
        {Object.entries(checksums).map(([name, value]) => (
          <li key={name} className="flex flex-col">
            <span className="uppercase text-gray-400">{name}</span>
            <span className="break-all">{value}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Patcher: React.FC = () => {
  const [originalBytes, setOriginalBytes] = useState<Uint8Array>(
    () => new Uint8Array(DEFAULT_SAMPLE),
  );
  const [bytes, setBytes] = useState<Uint8Array>(() => new Uint8Array(DEFAULT_SAMPLE));
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [future, setFuture] = useState<Uint8Array[]>([]);
  const [cellDrafts, setCellDrafts] = useState<Record<number, string>>({});
  const [fileMeta, setFileMeta] = useState(DEFAULT_META);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshots, setSnapshots, , clearSnapshots] = usePersistentState<PatchSnapshot[]>(
    'ghidra-patcher-snapshots',
    [],
    isSnapshotArray,
  );
  const [originalChecksums, setOriginalChecksums] = useState<Checksums>({});
  const [currentChecksums, setCurrentChecksums] = useState<Checksums>({});
  const [loadingChecksums, setLoadingChecksums] = useState(false);

  const diff = useMemo<PatchDiff[]>(() => {
    const changes: PatchDiff[] = [];
    const limit = Math.min(originalBytes.length, bytes.length);
    for (let i = 0; i < limit; i += 1) {
      if (originalBytes[i] !== bytes[i]) {
        changes.push({ offset: i, original: originalBytes[i], value: bytes[i] });
      }
    }
    return changes;
  }, [bytes, originalBytes]);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;
  const hasChanges = diff.length > 0;
  const byteLength = bytes.length;

  useEffect(() => {
    let cancelled = false;
    setLoadingChecksums(true);
    computeChecksums(originalBytes).then((result) => {
      if (!cancelled) {
        setOriginalChecksums(result);
        setLoadingChecksums(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [originalBytes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingChecksums(true);
    computeChecksums(bytes).then((result) => {
      if (!cancelled) {
        setCurrentChecksums(result);
        setLoadingChecksums(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const loaded = new Uint8Array(buffer);
      const truncated = loaded.length > MAX_BYTES;
      const sliced = truncated ? loaded.slice(0, MAX_BYTES) : loaded;
      const nextOriginal = new Uint8Array(sliced);
      setOriginalBytes(nextOriginal);
      setBytes(new Uint8Array(sliced));
      setHistory([]);
      setFuture([]);
      setCellDrafts({});
      setFileMeta({
        name: file.name,
        size: sliced.length,
        originalSize: loaded.length,
        truncated,
        source: 'file',
      });
    },
    [],
  );

  const handleByteInput = useCallback(
    (index: number, raw: string) => {
      const sanitized = raw.replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, 2);
      setCellDrafts((drafts) => ({ ...drafts, [index]: sanitized }));
      if (sanitized.length !== 2) return;
      const value = parseInt(sanitized, 16);
      if (Number.isNaN(value)) {
        setCellDrafts((drafts) => {
          const { [index]: _removed, ...rest } = drafts;
          return rest;
        });
        return;
      }
      setBytes((current) => {
        if (current[index] === value) {
          return current;
        }
        const snapshot = new Uint8Array(current);
        setHistory((prev) => {
          const next = [...prev, snapshot];
          if (next.length > HISTORY_LIMIT) {
            return next.slice(next.length - HISTORY_LIMIT);
          }
          return next;
        });
        setFuture([]);
        const updated = new Uint8Array(current);
        updated[index] = value;
        return updated;
      });
      setCellDrafts((drafts) => {
        const { [index]: _removed, ...rest } = drafts;
        return rest;
      });
    },
    [setHistory],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((next) => [new Uint8Array(bytes), ...next]);
      setBytes(new Uint8Array(previous));
      setCellDrafts({});
      return prev.slice(0, -1);
    });
  }, [bytes, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const [nextState, ...rest] = prev;
      setHistory((historySnapshot) => {
        const nextHistory = [...historySnapshot, new Uint8Array(bytes)];
        if (nextHistory.length > HISTORY_LIMIT) {
          return nextHistory.slice(nextHistory.length - HISTORY_LIMIT);
        }
        return nextHistory;
      });
      setBytes(new Uint8Array(nextState));
      setCellDrafts({});
      return rest;
    });
  }, [bytes, canRedo]);

  const revertAll = useCallback(() => {
    setBytes(new Uint8Array(originalBytes));
    setHistory([]);
    setFuture([]);
    setCellDrafts({});
  }, [originalBytes]);

  const exportDiff = useCallback(() => {
    if (!hasChanges) return;
    const payload = {
      createdAt: new Date().toISOString(),
      file: fileMeta.name,
      byteLength,
      originalSize: fileMeta.originalSize,
      truncated: fileMeta.truncated,
      checksums: {
        original: originalChecksums,
        current: currentChecksums,
      },
      changes: diff.map(({ offset, original, value }) => ({
        offset,
        original: hexifyByte(original),
        value: hexifyByte(value),
      })),
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = fileMeta.name.replace(/[^a-z0-9-_]+/gi, '_');
      link.download = `${safeName || 'patch'}.diff.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // ignore export errors
    }
    }, [byteLength, currentChecksums, diff, fileMeta, hasChanges, originalChecksums]);

  const saveSnapshot = useCallback(() => {
    const name = snapshotName.trim() || `Snapshot ${snapshots.length + 1}`;
    const snapshot: PatchSnapshot = {
      id: crypto.randomUUID?.() || `snapshot-${Date.now()}`,
      name,
      createdAt: Date.now(),
      baseHex: bytesToHex(originalBytes),
      currentHex: bytesToHex(bytes),
      fileName: fileMeta.name,
      byteLength,
    };
    setSnapshots((prev) => [...prev, snapshot]);
    setSnapshotName('');
  }, [
    bytes,
    byteLength,
    fileMeta.name,
    originalBytes,
    snapshotName,
    snapshots.length,
    setSnapshots,
  ]);

  const applySnapshot = useCallback(
    (snapshot: PatchSnapshot) => {
      const base = hexToBytes(snapshot.baseHex);
      const current = hexToBytes(snapshot.currentHex);
      setOriginalBytes(new Uint8Array(base));
      setBytes(new Uint8Array(current));
      setHistory([]);
      setFuture([]);
      setCellDrafts({});
      setFileMeta({
        name: snapshot.fileName || snapshot.name,
        size: current.length,
        originalSize: snapshot.byteLength,
        truncated: false,
        source: 'snapshot',
      });
    },
    [],
  );

  const deleteSnapshot = useCallback(
    (id: string) => {
      setSnapshots((prev) => prev.filter((snap) => snap.id !== id));
    },
    [setSnapshots],
  );

  const rows = useMemo(() => {
    const rowCount = Math.ceil(bytes.length / BYTES_PER_ROW);
    return Array.from({ length: rowCount }, (_, row) => {
      const offset = row * BYTES_PER_ROW;
      const slice = bytes.slice(offset, offset + BYTES_PER_ROW);
      const ascii = Array.from(slice)
        .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
        .join('');
      return { offset, slice, ascii };
    });
  }, [bytes]);

  return (
    <section className="p-4 space-y-4 bg-gray-900 text-gray-100 border-t border-gray-800">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">Binary patcher</h2>
        <p className="text-sm text-gray-400">
          Load a binary sample, edit bytes in-place, and track diffs with undo/redo
          support. Snapshots persist between sessions so you can iterate on multiple
          patch strategies.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Load file</span>
            <input
              type="file"
              accept=".bin,.exe,.dll,.elf,.dat"
              onChange={handleFile}
              aria-label="Load binary file"
            />
          </label>
        <div>
          <span className="font-semibold text-gray-300">Source:</span>{' '}
          <span className="text-gray-400">{fileMeta.name}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-300">Bytes:</span>{' '}
          <span className="text-gray-400">{bytes.length}</span>
          {fileMeta.truncated && (
            <span className="ml-2 text-amber-400">
              truncated view of {fileMeta.originalSize} bytes
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={`px-3 py-1 rounded border ${
            canUndo
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className={`px-3 py-1 rounded border ${
            canRedo
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Redo
        </button>
        <button
          type="button"
          onClick={revertAll}
          disabled={!hasChanges}
          className={`px-3 py-1 rounded border ${
            hasChanges
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Revert to original
        </button>
        <button
          type="button"
          onClick={exportDiff}
          disabled={!hasChanges}
          className={`px-3 py-1 rounded border ${
            hasChanges
              ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500'
              : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Export diff JSON
        </button>
      </div>
      <div className="text-xs text-gray-400">
        {hasChanges ? `${diff.length} byte${diff.length === 1 ? '' : 's'} modified` : 'No modifications yet'}
        {loadingChecksums && <span className="ml-2 text-gray-500">Recalculating checksums…</span>}
      </div>
      <div className="overflow-auto border border-gray-800 rounded">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-gray-800 text-gray-300">
              <th className="px-2 py-1 text-left">Offset</th>
              {Array.from({ length: BYTES_PER_ROW }, (_, i) => (
                <th key={i} className="px-2 py-1 text-center">
                  {i.toString(16).toUpperCase()}
                </th>
              ))}
              <th className="px-2 py-1 text-left">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ offset, slice, ascii }) => (
              <tr key={offset} className="border-t border-gray-800">
                <th className="px-2 py-1 text-left text-gray-400">
                  {offset.toString(16).padStart(6, '0').toUpperCase()}
                </th>
                {Array.from({ length: BYTES_PER_ROW }, (_, column) => {
                  const absolute = offset + column;
                  const value = slice[column];
                  if (typeof value === 'undefined') {
                    return (
                      <td key={absolute} className="px-2 py-1 text-center" aria-hidden />
                    );
                  }
                  const changed = originalBytes[absolute] !== value;
                  const display = cellDrafts[absolute] ?? hexifyByte(value);
                  return (
                    <td key={absolute} className="px-1 py-1 text-center">
                      <input
                        aria-label={`Byte ${absolute}`}
                        value={display}
                        onChange={(event) => handleByteInput(absolute, event.target.value)}
                        onFocus={(event) => event.target.select()}
                        className={`w-12 px-1 py-0.5 text-center rounded border font-mono uppercase ${
                          changed
                            ? 'bg-yellow-900 border-yellow-600 text-yellow-100'
                            : 'bg-gray-800 border-gray-700 text-gray-100'
                        }`}
                        maxLength={2}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-left text-gray-300">{ascii}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChecksumList title="Original checksums" checksums={originalChecksums} />
        <ChecksumList title="Patched checksums" checksums={currentChecksums} />
      </div>
      <div className="max-h-40 overflow-auto border border-gray-800 rounded">
        <table className="w-full text-xs font-mono">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-2 py-1 text-left">Offset</th>
              <th className="px-2 py-1 text-left">Original</th>
              <th className="px-2 py-1 text-left">Patched</th>
            </tr>
          </thead>
          <tbody>
            {diff.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-2 text-center text-gray-400">
                  No byte differences detected.
                </td>
              </tr>
            ) : (
              diff.map(({ offset, original, value }) => (
                <tr key={offset} className="border-t border-gray-800">
                  <td className="px-2 py-1">0x{offset.toString(16).padStart(6, '0').toUpperCase()}</td>
                  <td className="px-2 py-1 text-gray-400">{hexifyByte(original)}</td>
                  <td className="px-2 py-1 text-green-300">{hexifyByte(value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-sm">Patch snapshots</h3>
          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={clearSnapshots}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={snapshotName}
            onChange={(event) => setSnapshotName(event.target.value)}
            placeholder="Snapshot name"
            aria-label="Snapshot name"
            className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-sm"
          />
          <button
            type="button"
            onClick={saveSnapshot}
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
          >
            Save snapshot
          </button>
        </div>
        <ul className="space-y-2">
          {snapshots.length === 0 ? (
            <li className="text-xs text-gray-400">
              No snapshots yet. Save versions of your patched binary here and switch
              between them instantly.
            </li>
          ) : (
            snapshots
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-gray-800 rounded px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{snapshot.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(snapshot.createdAt).toLocaleString()} • {snapshot.byteLength} bytes
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => applySnapshot(snapshot)}
                      className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSnapshot(snapshot.id)}
                      className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
          )}
        </ul>
      </div>
    </section>
  );
};

export default Patcher;
