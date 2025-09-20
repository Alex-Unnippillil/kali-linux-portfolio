'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useOPFS from '../../../hooks/useOPFS';
import useTrashState from '../../../apps/trash/state';
import {
  collectFiles,
  findDuplicates,
  moveFilesToDuplicateTrash,
  restoreDuplicateFromTrash,
  type DuplicateGroup,
  type DuplicateScanResult,
  type HeuristicMatch,
  type ScannedFile,
  type DuplicateTrashPayload,
} from '../../../utils/files/duplicateScanner';
import { logEvent } from '../../../utils/analytics';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleString();

const normaliseTargetPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';
  return trimmed.replace(/^\/+|\/+$|^\.\/+/g, '');
};

const selectionKey = (groupId: string, file: ScannedFile) => `${groupId}|${file.relativePath}`;

const isTextLike = (name: string, type: string) => {
  if (type.startsWith('text/')) return true;
  const extension = name.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  const textExtensions = [
    'txt',
    'md',
    'json',
    'js',
    'ts',
    'tsx',
    'jsx',
    'css',
    'html',
    'csv',
    'log',
    'yml',
    'yaml',
  ];
  return textExtensions.includes(extension);
};

interface PreviewState {
  path: string;
  type: 'none' | 'text' | 'image' | 'binary';
  content: string;
  size: number;
  mime: string;
  lastModified: number;
}

interface RecentRemoval {
  payload: DuplicateTrashPayload;
  closedAt: number;
  name: string;
}

const DEFAULT_PREVIEW: PreviewState = {
  path: '',
  type: 'none',
  content: '',
  size: 0,
  mime: '',
  lastModified: 0,
};

const buildInitialSelection = (result: DuplicateScanResult): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  result.confirmed.forEach(group => {
    group.files.forEach((file, index) => {
      map[selectionKey(group.id, file)] = index !== 0;
    });
  });
  result.probable.forEach(group => {
    group.files.forEach(file => {
      map[selectionKey(group.id, file)] = false;
    });
  });
  return map;
};

const withDisplayPath = (basePath: string, relative: string) => {
  const prefix = basePath ? `/${basePath}` : '';
  return `${prefix}/${relative}`.replace(/\/+/g, '/');
};

const ensureKeepOne = (
  group: DuplicateGroup | HeuristicMatch,
  keyToToggle: string,
  nextValue: boolean,
  selected: Record<string, boolean>,
) => {
  if (!nextValue) return true;
  const keys = group.files.map(file => selectionKey(group.id, file));
  const keepExists = keys.some(key => {
    if (key === keyToToggle) return false;
    return !selected[key];
  });
  return keepExists;
};

const pruneGroups = (
  result: DuplicateScanResult,
  removedKeys: Set<string>,
): DuplicateScanResult => ({
  confirmed: result.confirmed
    .map(group => ({
      ...group,
      files: group.files.filter(file => !removedKeys.has(selectionKey(group.id, file))),
    }))
    .filter(group => group.files.length > 1),
  probable: result.probable
    .map(group => ({
      ...group,
      files: group.files.filter(file => !removedKeys.has(selectionKey(group.id, file))),
    }))
    .filter(group => group.files.length > 1),
});

const DuplicateFinder: React.FC = () => {
  const { supported, root, getDir } = useOPFS();
  const { setItems } = useTrashState();
  const [currentDir, setCurrentDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [targetPath, setTargetPath] = useState('');
  const [pathInput, setPathInput] = useState('/');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [result, setResult] = useState<DuplicateScanResult | null>(null);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(DEFAULT_PREVIEW);
  const previewUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [recentRemovals, setRecentRemovals] = useState<RecentRemoval[]>([]);
  const [recoveredBytes, setRecoveredBytes] = useState(0);

  useEffect(() => {
    if (root) {
      setCurrentDir(root);
      setTargetPath('');
      setPathInput('/');
    }
  }, [root]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const applyPath = useCallback(async () => {
    if (!root) return;
    const nextPath = normaliseTargetPath(pathInput);
    if (!nextPath) {
      setCurrentDir(root);
      setTargetPath('');
      setError(null);
      return;
    }
    try {
      const handle = await getDir(nextPath, { create: false });
      if (!handle) {
        setError(`Directory "/${nextPath}" is not accessible.`);
        return;
      }
      setCurrentDir(handle);
      setTargetPath(nextPath);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open directory';
      setError(message);
    }
  }, [root, pathInput, getDir]);

  const startScan = useCallback(async () => {
    if (!currentDir || !root) return;
    setMessage(null);
    setError(null);
    setPreview(DEFAULT_PREVIEW);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScanning(true);
    try {
      const files = await collectFiles(currentDir, { signal: controller.signal });
      if (!files.length) {
        setResult({ confirmed: [], probable: [] });
        setSelectedMap({});
        setProgress({ processed: 0, total: 0 });
        setMessage('No files detected in this directory.');
        return;
      }
      setProgress({ processed: 0, total: files.length });
      const found = await findDuplicates(files, {
        signal: controller.signal,
        onProgress: (processed, total) => setProgress({ processed, total }),
      });
      setResult(found);
      setSelectedMap(buildInitialSelection(found));
      if (!found.confirmed.length && !found.probable.length) {
        setMessage('No duplicates detected.');
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        setMessage('Scan cancelled.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to scan directory';
        setError(message);
      }
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }, [currentDir, root]);

  const cancelScan = useCallback(() => {
    if (scanning) {
      abortRef.current?.abort();
    }
  }, [scanning]);

  const groupsSummary = useMemo(() => {
    if (!result) return { confirmed: 0, probable: 0 };
    return {
      confirmed: result.confirmed.length,
      probable: result.probable.length,
    };
  }, [result]);

  const selectionSummary = useMemo(() => {
    if (!result) return { count: 0, bytes: 0 };
    let count = 0;
    let bytes = 0;
    result.confirmed.forEach(group => {
      group.files.forEach(file => {
        if (selectedMap[selectionKey(group.id, file)]) {
          count += 1;
          bytes += file.size;
        }
      });
    });
    result.probable.forEach(group => {
      group.files.forEach(file => {
        if (selectedMap[selectionKey(group.id, file)]) {
          count += 1;
          bytes += file.size;
        }
      });
    });
    return { count, bytes };
  }, [result, selectedMap]);

  const toggleSelection = useCallback(
    (group: DuplicateGroup | HeuristicMatch, file: ScannedFile) => {
      setSelectedMap(prev => {
        const key = selectionKey(group.id, file);
        const current = prev[key] ?? false;
        const nextValue = !current;
        if (nextValue && !ensureKeepOne(group, key, nextValue, prev)) {
          alert('Keep at least one copy from each group.');
          return prev;
        }
        return { ...prev, [key]: nextValue };
      });
    },
    [],
  );

  const handlePreview = useCallback(
    async (group: DuplicateGroup | HeuristicMatch, file: ScannedFile) => {
      try {
        const blob = await file.handle.getFile();
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        if (blob.type.startsWith('image/')) {
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreview({
            path: withDisplayPath(targetPath, file.relativePath),
            type: 'image',
            content: url,
            size: blob.size,
            mime: blob.type,
            lastModified: blob.lastModified ?? Date.now(),
          });
          return;
        }
        if (isTextLike(file.name, blob.type)) {
          const text = await blob.text();
          setPreview({
            path: withDisplayPath(targetPath, file.relativePath),
            type: 'text',
            content: text.slice(0, 4000),
            size: blob.size,
            mime: blob.type || 'text/plain',
            lastModified: blob.lastModified ?? Date.now(),
          });
          return;
        }
        setPreview({
          path: withDisplayPath(targetPath, file.relativePath),
          type: 'binary',
          content: `Binary file (${formatBytes(blob.size)})`,
          size: blob.size,
          mime: blob.type || 'application/octet-stream',
          lastModified: blob.lastModified ?? Date.now(),
        });
      } catch {
        setError('Unable to load preview for this file.');
      }
    },
    [targetPath],
  );

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    },
    [],
  );

  const deleteSelected = useCallback(async () => {
    if (!result || !root) return;
    const toDelete: { group: DuplicateGroup | HeuristicMatch; file: ScannedFile }[] = [];
    result.confirmed.forEach(group => {
      group.files.forEach(file => {
        if (selectedMap[selectionKey(group.id, file)]) {
          toDelete.push({ group, file });
        }
      });
    });
    result.probable.forEach(group => {
      group.files.forEach(file => {
        if (selectedMap[selectionKey(group.id, file)]) {
          toDelete.push({ group, file });
        }
      });
    });

    if (!toDelete.length) {
      setMessage('Select at least one file to move to Trash.');
      return;
    }

    const totalBytes = toDelete.reduce((sum, entry) => sum + entry.file.size, 0);
    const confirm = window.confirm(
      `Move ${toDelete.length} file${toDelete.length === 1 ? '' : 's'} (${formatBytes(
        totalBytes,
      )}) to Trash?`,
    );
    if (!confirm) return;

    try {
      const files = toDelete.map(entry => entry.file);
      const outcome = await moveFilesToDuplicateTrash(files, root, targetPath);
      const removedKeys = new Set<string>();

      if (outcome.successes.length) {
        setItems(items => [...outcome.successes.map(success => success.trashItem), ...items]);
        setRecentRemovals(prev => {
          const additions: RecentRemoval[] = outcome.successes.map(success => ({
            payload: success.payload,
            closedAt: success.trashItem.closedAt,
            name: success.trashItem.title,
          }));
          return [...additions, ...prev].slice(0, 6);
        });
        setRecoveredBytes(prev => prev + outcome.bytesMoved);
        logEvent({
          category: 'DuplicateFinder',
          action: 'cleanup',
          label: 'moved-to-trash',
          value: Math.round(outcome.bytesMoved / 1024),
        });
        outcome.successes.forEach(success => {
          const groupEntry = toDelete.find(entry => entry.file === success.file);
          if (groupEntry) {
            removedKeys.add(selectionKey(groupEntry.group.id, success.file));
          }
        });
        setResult(prev => (prev ? pruneGroups(prev, removedKeys) : prev));
        setSelectedMap(prev => {
          const copy = { ...prev };
          removedKeys.forEach(key => delete copy[key]);
          return copy;
        });
        setMessage(`${outcome.successes.length} file(s) moved to Trash.`);
        window.dispatchEvent(new Event('trash-change'));
      }

      if (outcome.failures.length) {
        setError(
          `Failed to move ${outcome.failures.length} file${
            outcome.failures.length === 1 ? '' : 's'
          } to Trash.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to move files to Trash';
      setError(message);
    }
  }, [result, root, selectedMap, targetPath, setItems, setRecentRemovals]);

  const undoRemoval = useCallback(
    async (entry: RecentRemoval) => {
      if (!root) return;
      const restored = await restoreDuplicateFromTrash(entry.payload, root);
      if (!restored) {
        setError('Unable to restore file from Trash backup.');
        return;
      }
      setItems(items =>
        items.filter(
          item =>
            item.payload?.type !== 'duplicate-file' ||
            (item.payload as DuplicateTrashPayload).backupName !== entry.payload.backupName,
        ),
      );
      setRecentRemovals(prev =>
        prev.filter(existing => existing.payload.backupName !== entry.payload.backupName),
      );
      window.dispatchEvent(new Event('trash-change'));
      setMessage(`${entry.name} restored to ${entry.payload.relativePath}`);
    },
    [root, setItems],
  );

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-black border-opacity-30 px-4 py-3 flex flex-col space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Duplicate Finder</h1>
          <span className="text-xs bg-black bg-opacity-40 px-2 py-0.5 rounded">
            {supported ? 'OPFS enabled' : 'File System API unavailable'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="duplicate-path" className="sr-only">
            Directory path
          </label>
          <input
            id="duplicate-path"
            className="bg-black bg-opacity-40 px-2 py-1 rounded outline-none focus:ring-2 focus:ring-ubt-blue min-w-[10rem]"
            value={pathInput}
            onChange={event => setPathInput(event.target.value)}
            placeholder="/"
          />
          <button
            onClick={applyPath}
            className="px-3 py-1 bg-ubt-blue rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
          >
            Change directory
          </button>
          <button
            onClick={startScan}
            disabled={!supported || !currentDir || scanning}
            className="px-3 py-1 bg-green-600 rounded hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
          >
            {scanning ? 'Scanning…' : 'Scan for duplicates'}
          </button>
          {scanning && (
            <button
              onClick={cancelScan}
              className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              Cancel
            </button>
          )}
          <span className="ml-auto text-xs text-gray-300">
            Current: {withDisplayPath(targetPath, '') || '/'}
          </span>
        </div>
        {scanning && (
          <div className="text-xs text-gray-300">
            Processing {progress.processed} of {progress.total}
          </div>
        )}
        {message && <div className="text-xs text-green-300">{message}</div>}
        {error && <div className="text-xs text-red-300">{error}</div>}
        {recoveredBytes > 0 && (
          <div className="text-xs text-gray-200">
            Recovered space: {formatBytes(recoveredBytes)}
          </div>
        )}
      </header>
      <div className="flex flex-1 overflow-hidden">
        <section className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-semibold">Confirmed duplicates</h2>
            <span className="text-xs text-gray-300">Groups: {groupsSummary.confirmed}</span>
          </div>
          {result?.confirmed.length ? (
            result.confirmed.map(group => (
              <div key={group.id} className="bg-black bg-opacity-30 rounded border border-black border-opacity-20">
                <header className="px-3 py-2 flex items-center justify-between border-b border-black border-opacity-20">
                  <div>
                    <h3 className="font-semibold text-sm">SHA-256: {group.hash.slice(0, 12)}…</h3>
                    <p className="text-xs text-gray-300">{group.reasons.join(', ')}</p>
                  </div>
                  <span className="text-xs text-gray-300">{group.files.length} copies</span>
                </header>
                <ul>
                  {group.files.map(file => {
                    const key = selectionKey(group.id, file);
                    const isSelected = !!selectedMap[key];
                    return (
                      <li
                        key={file.relativePath}
                        className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-black hover:bg-opacity-30"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(group, file)}
                          className="accent-ubt-blue"
                          aria-label={`Select ${file.name}`}
                        />
                        <button
                          type="button"
                          className="text-left flex-1 truncate hover:underline"
                          onClick={() => handlePreview(group, file)}
                        >
                          {file.name}
                        </button>
                        <span className="text-xs text-gray-300">{formatBytes(file.size)}</span>
                        <span className="text-xs text-gray-300">{formatDate(file.lastModified)}</span>
                        <span className="text-xs text-gray-300">{withDisplayPath(targetPath, file.relativePath)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-300">No confirmed duplicates detected.</p>
          )}

          <div className="flex items-center justify-between mt-4">
            <h2 className="text-md font-semibold">Likely duplicates</h2>
            <span className="text-xs text-gray-300">Groups: {groupsSummary.probable}</span>
          </div>
          {result?.probable.length ? (
            result.probable.map(group => (
              <div key={group.id} className="bg-black bg-opacity-20 rounded border border-black border-opacity-10">
                <header className="px-3 py-2 flex items-center justify-between border-b border-black border-opacity-10">
                  <div>
                    <h3 className="font-semibold text-sm">{group.key}</h3>
                    <p className="text-xs text-yellow-200">
                      Confidence {Math.round(group.confidence * 100)}% — {group.reasons.join(', ')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300">{group.files.length} matches</span>
                </header>
                <ul>
                  {group.files.map(file => {
                    const key = selectionKey(group.id, file);
                    const isSelected = !!selectedMap[key];
                    return (
                      <li
                        key={file.relativePath}
                        className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-black hover:bg-opacity-30"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(group, file)}
                          className="accent-yellow-400"
                          aria-label={`Select ${file.name}`}
                        />
                        <button
                          type="button"
                          className="text-left flex-1 truncate hover:underline"
                          onClick={() => handlePreview(group, file)}
                        >
                          {file.name}
                        </button>
                        <span className="text-xs text-gray-300">{formatBytes(file.size)}</span>
                        <span className="text-xs text-gray-300">{formatDate(file.lastModified)}</span>
                        <span className="text-xs text-gray-300">{withDisplayPath(targetPath, file.relativePath)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-300">No heuristic matches currently flagged.</p>
          )}
        </section>
        <aside className="w-80 border-l border-black border-opacity-30 bg-black bg-opacity-20 p-4 flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-sm mb-2">Selection</h2>
            <p className="text-xs text-gray-200">
              {selectionSummary.count} file{selectionSummary.count === 1 ? '' : 's'} selected —{' '}
              {formatBytes(selectionSummary.bytes)}
            </p>
            <button
              onClick={deleteSelected}
              disabled={selectionSummary.count === 0}
              className="mt-2 w-full px-3 py-2 bg-red-600 rounded hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
            >
              Move selected to Trash
            </button>
          </div>

          <div>
            <h2 className="font-semibold text-sm mb-2">Preview</h2>
            {preview.type === 'image' && (
              <img
                src={preview.content}
                alt={preview.path}
                className="w-full rounded border border-black border-opacity-20"
              />
            )}
            {preview.type === 'text' && (
              <pre className="whitespace-pre-wrap text-xs bg-black bg-opacity-30 rounded p-2 max-h-60 overflow-auto">
                {preview.content}
              </pre>
            )}
            {preview.type === 'binary' && (
              <p className="text-xs text-gray-200">{preview.content}</p>
            )}
            {preview.type === 'none' && (
              <p className="text-xs text-gray-400">Select a file to preview its contents.</p>
            )}
            {preview.type !== 'none' && (
              <dl className="mt-2 text-xs text-gray-300 space-y-1">
                <div className="flex justify-between"><span>Path</span><span className="truncate">{preview.path}</span></div>
                <div className="flex justify-between"><span>Size</span><span>{formatBytes(preview.size)}</span></div>
                <div className="flex justify-between"><span>Type</span><span>{preview.mime || 'Unknown'}</span></div>
                <div className="flex justify-between"><span>Modified</span><span>{formatDate(preview.lastModified)}</span></div>
              </dl>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-sm mb-2">Recent removals</h2>
            {recentRemovals.length ? (
              <ul className="space-y-2 text-xs">
                {recentRemovals.map(entry => (
                  <li key={entry.payload.backupName} className="flex items-center justify-between gap-2">
                    <div className="truncate" title={entry.payload.relativePath}>
                      {entry.name}
                      <span className="block text-gray-400">{entry.payload.relativePath}</span>
                    </div>
                    <button
                      onClick={() => undoRemoval(entry)}
                      className="px-2 py-1 bg-blue-600 rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No recent actions.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export const displayDuplicateFinder = () => <DuplicateFinder />;

export default DuplicateFinder;
