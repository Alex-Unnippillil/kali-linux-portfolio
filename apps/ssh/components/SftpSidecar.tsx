'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SftpAdapter,
  SftpEntry,
  SftpOperationResult,
  SftpSide,
  SftpSnapshot,
  createSftpAdapter,
} from '../mocks/sftpAdapter';
import localSeed from '../../../data/ssh/sftp/local.json';
import remoteSeed from '../../../data/ssh/sftp/remote.json';

type PaneSide = SftpSide;

interface SftpSidecarProps {
  className?: string;
}

interface PaneProps {
  side: PaneSide;
  title: string;
  path: string[];
  entries: SftpEntry[];
  selection: string[] | null;
  onSelect: (path: string[]) => void;
  onEnterDirectory: (path: string[]) => void;
  onNavigate: (path: string[]) => void;
  selectedEntry: SftpEntry | null;
}

const SIDES: PaneSide[] = ['local', 'remote'];

const formatSize = (size?: number) => {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
};

const formatModified = (modified?: string) => {
  if (!modified) return 'Unknown';
  const date = new Date(modified);
  if (Number.isNaN(date.getTime())) return modified;
  return date.toLocaleString();
};

const findEntry = (entries: SftpEntry[], path: string[]): SftpEntry | null => {
  if (path.length === 0) return null;
  let currentEntries = entries;
  let current: SftpEntry | undefined;
  for (let i = 0; i < path.length; i += 1) {
    const segment = path[i];
    current = currentEntries.find((entry) => entry.name === segment);
    if (!current) return null;
    if (i < path.length - 1) {
      if (current.type !== 'directory' || !current.children) return null;
      currentEntries = current.children;
    }
  }
  return current ?? null;
};

const getDirectoryEntries = (entries: SftpEntry[], path: string[]): SftpEntry[] | null => {
  if (path.length === 0) return entries;
  const directory = findEntry(entries, path);
  if (!directory || directory.type !== 'directory') return null;
  return directory.children ?? [];
};

const Pane: React.FC<PaneProps> = ({
  side,
  title,
  path,
  entries,
  selection,
  onSelect,
  onEnterDirectory,
  onNavigate,
  selectedEntry,
}) => {
  const breadcrumbs = useMemo(() => {
    const base = [{ label: 'home', path: [] as string[] }];
    const crumbs = path.map((segment, index) => ({
      label: segment,
      path: path.slice(0, index + 1),
    }));
    return [...base, ...crumbs];
  }, [path]);

  return (
    <div className="flex h-full flex-col rounded border border-gray-800 bg-gray-900 shadow-inner">
      <div className="border-b border-gray-800 px-3 py-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
          <span>{title}</span>
          <span className="text-[11px] text-gray-600">{side}</span>
        </div>
        <nav className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={`${side}-crumb-${crumb.label}-${index}`}>
                <button
                  type="button"
                  className={`rounded px-1 py-0.5 ${
                    isLast
                      ? 'bg-gray-800 text-gray-300'
                      : 'hover:bg-gray-800 hover:text-gray-200'
                  }`}
                  onClick={() => onNavigate(crumb.path)}
                  disabled={isLast}
                >
                  {crumb.label}
                </button>
                {index < breadcrumbs.length - 1 && <span className="text-gray-700">/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
      <ul className="flex-1 overflow-auto text-sm">
        {entries.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-gray-500">This folder is empty.</li>
        )}
        {entries.map((entry) => {
          const nextPath = [...path, entry.name];
          const isSelected =
            selection !== null && selection.join('/') === nextPath.join('/');
          return (
            <li key={`${side}-${nextPath.join('/')}`} className="border-b border-gray-800 last:border-b-0">
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                  isSelected ? 'bg-gray-800/70 text-white' : 'hover:bg-gray-800/70'
                }`}
                onClick={() =>
                  entry.type === 'directory' ? onEnterDirectory(nextPath) : onSelect(nextPath)
                }
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-lg">
                    {entry.type === 'directory' ? '📁' : '📄'}
                  </span>
                  <span>{entry.name}</span>
                </span>
                <span className="text-xs text-gray-400">
                  {entry.type === 'file' ? formatSize(entry.size) : 'dir'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selectedEntry && (
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-gray-800 bg-gray-950 px-3 py-2 text-[11px] text-gray-400">
          <dt className="uppercase tracking-wide text-gray-500">Name</dt>
          <dd className="text-right text-gray-300">{selectedEntry.name}</dd>
          <dt className="uppercase tracking-wide text-gray-500">Size</dt>
          <dd className="text-right text-gray-300">{formatSize(selectedEntry.size)}</dd>
          <dt className="uppercase tracking-wide text-gray-500">Modified</dt>
          <dd className="text-right text-gray-300">{formatModified(selectedEntry.modified)}</dd>
        </dl>
      )}
    </div>
  );
};

const SftpSidecar: React.FC<SftpSidecarProps> = ({ className = '' }) => {
  const adapterRef = useRef<SftpAdapter | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = createSftpAdapter(
      localSeed as SftpEntry[],
      remoteSeed as SftpEntry[],
    );
  }
  const adapter = adapterRef.current;

  const [snapshot, setSnapshot] = useState<SftpSnapshot>(() => adapter.getSnapshot());
  const [paths, setPaths] = useState<Record<PaneSide, string[]>>({ local: [], remote: [] });
  const [selection, setSelection] = useState<Record<PaneSide, string[] | null>>({
    local: null,
    remote: null,
  });
  const [status, setStatus] = useState<SftpOperationResult | null>(null);

  useEffect(() => {
    const unsubscribe = adapter.subscribe(setSnapshot);
    return () => unsubscribe();
  }, [adapter]);

  useEffect(() => {
    setPaths((prev) => {
      let changed = false;
      const next = { ...prev };
      SIDES.forEach((side) => {
        if (!getDirectoryEntries(snapshot[side], prev[side])) {
          next[side] = [];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [snapshot]);

  useEffect(() => {
    setSelection((prev) => {
      let changed = false;
      const next = { ...prev };
      SIDES.forEach((side) => {
        const current = prev[side];
        if (current && !findEntry(snapshot[side], current)) {
          next[side] = null;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [snapshot]);

  const entries = useMemo(
    () => ({
      local: getDirectoryEntries(snapshot.local, paths.local) ?? [],
      remote: getDirectoryEntries(snapshot.remote, paths.remote) ?? [],
    }),
    [paths.local, paths.remote, snapshot.local, snapshot.remote],
  );

  const selectedEntries = useMemo(
    () => ({
      local: selection.local ? findEntry(snapshot.local, selection.local) : null,
      remote: selection.remote ? findEntry(snapshot.remote, selection.remote) : null,
    }),
    [selection.local, selection.remote, snapshot.local, snapshot.remote],
  );

  const selectFile = (side: PaneSide, pathValue: string[]) => {
    setSelection((prev) => ({ ...prev, [side]: pathValue }));
    setStatus(null);
  };

  const enterDirectory = (side: PaneSide, pathValue: string[]) => {
    setPaths((prev) => ({ ...prev, [side]: pathValue }));
    setStatus(null);
  };

  const navigateTo = (side: PaneSide, pathValue: string[]) => {
    setPaths((prev) => ({ ...prev, [side]: pathValue }));
    setStatus(null);
  };

  const ensureFileSelected = (side: PaneSide): string[] | null => {
    const current = selection[side];
    const entry = current ? findEntry(snapshot[side], current) : null;
    if (!entry || entry.type !== 'file') {
      return null;
    }
    return current;
  };

  const runOperation = (result: SftpOperationResult | null) => {
    if (result) {
      setStatus(result);
    }
  };

  const handleCopyLocalToRemote = () => {
    const sourcePath = ensureFileSelected('local');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a local file to copy.' });
      return;
    }
    const fileName = sourcePath[sourcePath.length - 1];
    const result = adapter.copy({
      from: 'local',
      to: 'remote',
      path: sourcePath,
      targetPath: paths.remote,
    });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, remote: [...paths.remote, fileName] }));
    }
  };

  const handleCopyRemoteToLocal = () => {
    const sourcePath = ensureFileSelected('remote');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a remote file to copy.' });
      return;
    }
    const fileName = sourcePath[sourcePath.length - 1];
    const result = adapter.copy({
      from: 'remote',
      to: 'local',
      path: sourcePath,
      targetPath: paths.local,
    });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, local: [...paths.local, fileName] }));
    }
  };

  const handleMoveLocalToRemote = () => {
    const sourcePath = ensureFileSelected('local');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a local file to move.' });
      return;
    }
    const fileName = sourcePath[sourcePath.length - 1];
    const result = adapter.move({
      from: 'local',
      to: 'remote',
      path: sourcePath,
      targetPath: paths.remote,
    });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, local: null, remote: [...paths.remote, fileName] }));
    }
  };

  const handleMoveRemoteToLocal = () => {
    const sourcePath = ensureFileSelected('remote');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a remote file to move.' });
      return;
    }
    const fileName = sourcePath[sourcePath.length - 1];
    const result = adapter.move({
      from: 'remote',
      to: 'local',
      path: sourcePath,
      targetPath: paths.local,
    });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, remote: null, local: [...paths.local, fileName] }));
    }
  };

  const handleDeleteLocal = () => {
    const sourcePath = ensureFileSelected('local');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a local file to delete.' });
      return;
    }
    const result = adapter.delete({ side: 'local', path: sourcePath });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, local: null }));
    }
  };

  const handleDeleteRemote = () => {
    const sourcePath = ensureFileSelected('remote');
    if (!sourcePath) {
      runOperation({ success: false, message: 'Select a remote file to delete.' });
      return;
    }
    const result = adapter.delete({ side: 'remote', path: sourcePath });
    runOperation(result);
    if (result.success) {
      setSelection((prev) => ({ ...prev, remote: null }));
    }
  };

  return (
    <aside
      className={`flex h-full min-h-[22rem] flex-col gap-4 border-t border-gray-800 bg-gray-950 p-4 text-sm text-gray-200 shadow-lg lg:border-l lg:border-t-0 ${className}`.trim()}
    >
      <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-2">
        <Pane
          side="local"
          title="Local Files"
          path={paths.local}
          entries={entries.local}
          selection={selection.local}
          selectedEntry={selectedEntries.local}
          onSelect={(pathValue) => selectFile('local', pathValue)}
          onEnterDirectory={(pathValue) => enterDirectory('local', pathValue)}
          onNavigate={(pathValue) => navigateTo('local', pathValue)}
        />
        <Pane
          side="remote"
          title="Remote Files"
          path={paths.remote}
          entries={entries.remote}
          selection={selection.remote}
          selectedEntry={selectedEntries.remote}
          onSelect={(pathValue) => selectFile('remote', pathValue)}
          onEnterDirectory={(pathValue) => enterDirectory('remote', pathValue)}
          onNavigate={(pathValue) => navigateTo('remote', pathValue)}
        />
      </div>
      <div className="flex flex-col gap-3 rounded border border-gray-800 bg-gray-900 p-3 text-xs text-gray-300">
        {status ? (
          <p className={status.success ? 'text-emerald-400' : 'text-red-400'}>{status.message}</p>
        ) : (
          <p className="text-gray-400">Select a file to copy, move, or delete.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleCopyLocalToRemote}
            disabled={!selectedEntries.local || selectedEntries.local.type !== 'file'}
          >
            Copy → Remote
          </button>
          <button
            type="button"
            className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleCopyRemoteToLocal}
            disabled={!selectedEntries.remote || selectedEntries.remote.type !== 'file'}
          >
            Copy → Local
          </button>
          <button
            type="button"
            className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleMoveLocalToRemote}
            disabled={!selectedEntries.local || selectedEntries.local.type !== 'file'}
          >
            Move → Remote
          </button>
          <button
            type="button"
            className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleMoveRemoteToLocal}
            disabled={!selectedEntries.remote || selectedEntries.remote.type !== 'file'}
          >
            Move → Local
          </button>
          <button
            type="button"
            className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleDeleteLocal}
            disabled={!selectedEntries.local || selectedEntries.local.type !== 'file'}
          >
            Delete Local
          </button>
          <button
            type="button"
            className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-gray-700"
            onClick={handleDeleteRemote}
            disabled={!selectedEntries.remote || selectedEntries.remote.type !== 'file'}
          >
            Delete Remote
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          Transfers are simulated and limited to small files in this mock sidecar.
        </p>
      </div>
    </aside>
  );
};

export default SftpSidecar;
