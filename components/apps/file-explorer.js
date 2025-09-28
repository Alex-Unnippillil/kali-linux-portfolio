"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useOPFS from '../../hooks/useOPFS';
import { getDb } from '../../utils/safeIDB';
import { resolveKaliIcon } from '../menu/PlacesMenu';

export async function openFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker(options);
    return handle;
  }

  return await new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.multiple) input.multiple = true;
    if (options?.types) {
      const accept = options.types
        .map((t) => t.accept && Object.values(t.accept).flat())
        .flat()
        .join(',');
      if (accept) input.accept = accept;
    }
    input.onchange = () => {
      const file = input.files[0];
      resolve(
        file && {
          name: file.name,
          getFile: async () => file,
        },
      );
    };
    input.click();
  });
}

export async function saveFileDialog(options = {}) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    return await window.showSaveFilePicker(options);
  }

  return {
    name: options?.suggestedName || 'download',
    async createWritable() {
      return {
        async write(data) {
          const blob = data instanceof Blob ? data : new Blob([data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = options?.suggestedName || 'download';
          a.click();
          URL.revokeObjectURL(url);
        },
        async close() {},
      };
    },
  };
}

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';
const DEFAULT_FILE_ICON = '/themes/Kali/categories/applications-all.svg';
const DEFAULT_FOLDER_ICON = '/themes/Kali/Places/folder.svg';
const FILE_ICON_MAP = {
  js: '/themes/filetypes/js.png',
  jsx: '/themes/filetypes/js.png',
  ts: '/themes/filetypes/js.png',
  tsx: '/themes/filetypes/js.png',
  json: '/themes/filetypes/js.png',
  php: '/themes/filetypes/php.png',
  zip: '/themes/filetypes/zip.png',
  gz: '/themes/filetypes/zip.png',
};

const QUICK_PLACES = [
  {
    id: 'home',
    label: 'Home',
    icon: '/themes/Kali/Places/user-home.svg',
    path: 'home/kali',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: '/themes/Kali/Places/folder-documents.svg',
    path: 'home/kali/Documents',
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: '/themes/Kali/Places/folder-download.svg',
    path: 'home/kali/Downloads',
  },
];

function createPaneState(handle = null, crumbs = []) {
  const history = handle && crumbs.length ? [{ handle, path: crumbs }] : [];
  return {
    dirHandle: handle,
    path: crumbs,
    entries: [],
    selection: 0,
    history,
    historyIndex: history.length ? history.length - 1 : -1,
  };
}

function openDB() {
  return getDb(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { autoIncrement: true });
    },
  });
}

async function getRecentDirs() {
  try {
    const dbp = openDB();
    if (!dbp) return [];
    const db = await dbp;
    return (await db.getAll(STORE_NAME)) || [];
  } catch {
    return [];
  }
}

async function addRecentDir(handle) {
  try {
    const dbp = openDB();
    if (!dbp) return;
    const db = await dbp;
    const entry = { name: handle.name, handle };
    await db.put(STORE_NAME, entry);
  } catch {}
}

function getFolderIcon(name, fallback = DEFAULT_FOLDER_ICON) {
  const lower = (name || '').toLowerCase();
  return (
    resolveKaliIcon(lower) ||
    resolveKaliIcon(`folder-${lower}`) ||
    resolveKaliIcon(`${lower}-folder`) ||
    fallback
  );
}

function getFileIcon(name) {
  const parts = name.split('.');
  if (parts.length <= 1) return DEFAULT_FILE_ICON;
  const ext = parts.pop().toLowerCase();
  return FILE_ICON_MAP[ext] || DEFAULT_FILE_ICON;
}

function FileBreadcrumbs({ path, onNavigate }) {
  if (!path?.length) return null;
  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-xs text-[var(--kali-text)]"
      aria-label="Breadcrumb"
    >
      {path.map((segment, index) => {
        const isLast = index === path.length - 1;
        const display = segment.name || '/';
        const icon =
          index === 0
            ? resolveKaliIcon('home') || '/themes/Kali/Places/user-home.svg'
            : getFolderIcon(display);
        return (
          <React.Fragment key={`${display}-${index}`}>
            <button
              type="button"
              onClick={() => onNavigate(index)}
              className={`flex items-center gap-1 rounded px-2 py-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)] ${
                isLast
                  ? 'bg-[var(--kali-panel-highlight)] text-white'
                  : 'hover:bg-[var(--kali-panel-highlight)]/80'
              }`}
              aria-current={isLast ? 'page' : undefined}
            >
              <img src={icon} alt="" className="h-4 w-4" />
              <span className="truncate" title={display}>
                {display}
              </span>
            </button>
            {!isLast && <span className="px-0.5 text-[var(--kali-panel-border)]">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default function FileExplorer({ context, initialPath, path: pathProp } = {}) {
  const [supported, setSupported] = useState(true);
  const [recent, setRecent] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [panes, setPanes] = useState(() => [createPaneState()]);
  const [activePane, setActivePane] = useState(0);
  const [dualPane, setDualPane] = useState(false);
  const [unsavedDir, setUnsavedDir] = useState(null);
  const workerRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const paneRefs = useRef([]);
  const initialisedRef = useRef(false);

  const hasWorker = typeof Worker !== 'undefined';
  const {
    supported: opfsSupported,
    root,
    getDir,
    readFile: opfsRead,
    writeFile: opfsWrite,
    deleteFile: opfsDelete,
  } = useOPFS();

  useEffect(() => {
    const ok = typeof window !== 'undefined' && !!window.showDirectoryPicker;
    setSupported(ok);
    if (ok) getRecentDirs().then(setRecent);
  }, []);

  useEffect(() => {
    if (!opfsSupported || !root) return;
    getDir('unsaved')
      .then((handle) => {
        setUnsavedDir(handle);
      })
      .catch(() => {});
  }, [opfsSupported, root, getDir]);

  const saveBuffer = useCallback(
    async (name, data) => {
      if (unsavedDir) await opfsWrite(name, data, unsavedDir);
    },
    [unsavedDir, opfsWrite],
  );

  const loadBuffer = useCallback(
    async (name) => {
      if (!unsavedDir) return null;
      return await opfsRead(name, unsavedDir);
    },
    [unsavedDir, opfsRead],
  );

  const removeBuffer = useCallback(
    async (name) => {
      if (unsavedDir) await opfsDelete(name, unsavedDir);
    },
    [unsavedDir, opfsDelete],
  );

  const listDirectoryEntries = useCallback(async (handle) => {
    const directories = [];
    const files = [];
    for await (const [name, h] of handle.entries()) {
      if (h.kind === 'directory') {
        directories.push({ type: 'directory', name, handle: h, icon: getFolderIcon(name) });
      } else if (h.kind === 'file') {
        files.push({ type: 'file', name, handle: h, icon: getFileIcon(name) });
      }
    }
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...directories, ...files];
  }, []);

  const refreshPane = useCallback(
    async (paneIndex, handle, crumbs, options = {}) => {
      if (!handle) return;
      try {
        const entries = await listDirectoryEntries(handle);
        setPanes((prev) => {
          const next = [...prev];
          const existing = next[paneIndex] || createPaneState();
          const nextPath = (crumbs ?? existing.path).map((crumb) => ({ ...crumb }));
          const historyEntry = { handle, path: nextPath.map((crumb) => ({ ...crumb })) };
          let history = existing.history;
          let historyIndex = existing.historyIndex;

          if (options.resetHistory) {
            history = [historyEntry];
            historyIndex = 0;
          } else if (options.pushHistory) {
            const truncated = history.slice(0, historyIndex + 1);
            const last = truncated[truncated.length - 1];
            if (!last || last.handle !== handle) {
              history = [...truncated, historyEntry];
              historyIndex = history.length - 1;
            } else {
              history = truncated;
              historyIndex = truncated.length - 1;
            }
          }

          let selection = existing.selection;
          if (!entries.length) {
            selection = -1;
          } else if (selection < 0 || selection >= entries.length) {
            selection = 0;
          }

          next[paneIndex] = {
            ...existing,
            dirHandle: handle,
            path: nextPath,
            entries,
            selection,
            history,
            historyIndex,
          };
          return next;
        });
        setLocationError(null);
      } catch {
        setLocationError('Unable to read directory');
      }
    },
    [listDirectoryEntries],
  );

  const resolvePath = useCallback(
    async (requested) => {
      if (!root) return null;
      const sanitized = (requested || '')
        .replace(/^~\//, 'home/kali/')
        .replace(/^\/+/, '')
        .trim();

      let current = root;
      const crumbs = [{ name: root.name || '/', handle: root }];

      if (!sanitized) {
        return { handle: current, crumbs };
      }

      const segments = sanitized
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);

      try {
        for (const segment of segments) {
          current = await current.getDirectoryHandle(segment, { create: true });
          crumbs.push({ name: segment, handle: current });
        }
        return { handle: current, crumbs };
      } catch {
        return null;
      }
    },
    [root],
  );

  useEffect(() => {
    if (!opfsSupported || !root || initialisedRef.current) return;
    initialisedRef.current = true;
    const crumbs = [{ name: root.name || '/', handle: root }];
    setPanes([createPaneState(root, crumbs)]);
    refreshPane(0, root, crumbs, { resetHistory: true });
  }, [opfsSupported, root, refreshPane]);

  useEffect(() => {
    const requested =
      (context?.initialPath ?? context?.path ?? initialPath ?? pathProp) || '';
    if (!requested || !opfsSupported || !root) return;

    let cancelled = false;
    const openRequested = async () => {
      const resolved = await resolvePath(requested);
      if (!resolved) {
        if (!cancelled) setLocationError(`Unable to open ${requested}`);
        return;
      }
      if (cancelled) return;
      await refreshPane(0, resolved.handle, resolved.crumbs, { resetHistory: true });
      if (!cancelled) {
        setActivePane(0);
        setLocationError(null);
      }
    };

    openRequested();
    return () => {
      cancelled = true;
    };
  }, [context, initialPath, pathProp, opfsSupported, root, resolvePath, refreshPane]);

  const panesToRender = useMemo(
    () => (dualPane ? panes.slice(0, 2) : panes.slice(0, 1)),
    [dualPane, panes],
  );

  const openFallback = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCurrentFile({ name: file.name });
    setContent(text);
  };

  const openDirectoryInPane = async (paneIndex, handle, crumbs, options = {}) => {
    setActivePane(paneIndex);
    await refreshPane(paneIndex, handle, crumbs, options);
  };

  const openFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      addRecentDir(handle);
      setRecent(await getRecentDirs());
      const crumbs = [{ name: handle.name || '/', handle }];
      await openDirectoryInPane(activePane, handle, crumbs, { resetHistory: true });
      setLocationError(null);
    } catch {}
  };

  const openRecent = async (entry) => {
    try {
      const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const crumbs = [{ name: entry.name || '/', handle: entry.handle }];
      await openDirectoryInPane(activePane, entry.handle, crumbs, { resetHistory: true });
      setLocationError(null);
    } catch {}
  };

  const openQuickPlace = async (place) => {
    if (!opfsSupported || !root) return;
    const resolved = await resolvePath(place.path);
    if (!resolved) {
      setLocationError(`Unable to open ${place.label}`);
      return;
    }
    await openDirectoryInPane(activePane, resolved.handle, resolved.crumbs, { pushHistory: true });
  };

  const handleEntryAction = async (paneIndex, entry, entryIndex) => {
    if (!entry) return;
    setPanes((prev) => {
      const next = [...prev];
      if (next[paneIndex]) {
        next[paneIndex] = { ...next[paneIndex], selection: entryIndex };
      }
      return next;
    });
    if (entry.type === 'directory') {
      const pane = panes[paneIndex] || createPaneState();
      const crumbs = [...pane.path.map((crumb) => ({ ...crumb })), { name: entry.name, handle: entry.handle }];
      await openDirectoryInPane(paneIndex, entry.handle, crumbs, { pushHistory: true });
    } else {
      setActivePane(paneIndex);
      setCurrentFile(entry);
      let text = '';
      if (opfsSupported) {
        const unsaved = await loadBuffer(entry.name);
        if (unsaved !== null) text = unsaved;
      }
      if (!text) {
        const file = await entry.handle.getFile();
        text = await file.text();
      }
      setContent(text);
    }
  };

  const handleBreadcrumbNavigate = async (paneIndex, crumbIndex) => {
    const pane = panes[paneIndex];
    if (!pane) return;
    const target = pane.path[crumbIndex];
    if (!target?.handle) return;
    const crumbs = pane.path.slice(0, crumbIndex + 1).map((crumb) => ({ ...crumb }));
    await openDirectoryInPane(paneIndex, target.handle, crumbs, { pushHistory: true });
  };

  const navigateHistory = async (paneIndex, delta) => {
    const pane = panes[paneIndex];
    if (!pane) return;
    const nextIndex = pane.historyIndex + delta;
    if (nextIndex < 0 || nextIndex >= pane.history.length) return;
    const entry = pane.history[nextIndex];
    setPanes((prev) => {
      const next = [...prev];
      const updated = { ...next[paneIndex], historyIndex: nextIndex };
      next[paneIndex] = updated;
      return next;
    });
    await refreshPane(paneIndex, entry.handle, entry.path, { pushHistory: false });
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      const writable = await currentFile.handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (opfsSupported) await removeBuffer(currentFile.name);
    } catch {}
  };

  const onChange = (event) => {
    const text = event.target.value;
    setContent(text);
    if (opfsSupported && currentFile) saveBuffer(currentFile.name, text);
  };

  const runSearch = () => {
    const dirHandle = panes[activePane]?.dirHandle;
    if (!dirHandle || !hasWorker) return;
    setResults([]);
    if (workerRef.current) workerRef.current.terminate();
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./find.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        const { file, line, text, done } = e.data;
        if (done) {
          workerRef.current?.terminate();
          workerRef.current = null;
        } else {
          setResults((prev) => [...prev, { file, line, text }]);
        }
      };
      workerRef.current.postMessage({ directoryHandle: dirHandle, query });
    }
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  const handlePaneKeyDown = async (event, paneIndex) => {
    const pane = panes[paneIndex];
    if (!pane) return;
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      await navigateHistory(paneIndex, -1);
      return;
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      await navigateHistory(paneIndex, 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setPanes((prev) => {
        const next = [...prev];
        const current = next[paneIndex];
        if (!current?.entries.length) return prev;
        const selection = Math.min(current.entries.length - 1, (current.selection ?? -1) + 1);
        next[paneIndex] = { ...current, selection };
        return next;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setPanes((prev) => {
        const next = [...prev];
        const current = next[paneIndex];
        if (!current?.entries.length) return prev;
        const selection = Math.max(0, (current.selection ?? 0) - 1);
        next[paneIndex] = { ...current, selection };
        return next;
      });
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setPanes((prev) => {
        const next = [...prev];
        const current = next[paneIndex];
        if (!current?.entries.length) return prev;
        next[paneIndex] = { ...current, selection: 0 };
        return next;
      });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setPanes((prev) => {
        const next = [...prev];
        const current = next[paneIndex];
        if (!current?.entries.length) return prev;
        next[paneIndex] = { ...current, selection: current.entries.length - 1 };
        return next;
      });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const entryIndex = pane.selection ?? 0;
      const entry = pane.entries[entryIndex];
      await handleEntryAction(paneIndex, entry, entryIndex);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (pane.path.length > 1) {
        await handleBreadcrumbNavigate(paneIndex, pane.path.length - 2);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && dualPane && paneIndex > 0) {
      event.preventDefault();
      const nextPane = paneIndex - 1;
      setActivePane(nextPane);
      paneRefs.current[nextPane]?.focus();
      return;
    }
    if (event.key === 'ArrowRight' && dualPane && paneIndex < panesToRender.length - 1) {
      event.preventDefault();
      const nextPane = paneIndex + 1;
      setActivePane(nextPane);
      paneRefs.current[nextPane]?.focus();
    }
  };

  const toggleDualPane = () => {
    setDualPane((prev) => {
      const next = !prev;
      setPanes((existing) => {
        if (next) {
          if (existing.length >= 2) return existing.slice(0, 2);
          const primary = existing[0] ?? createPaneState();
          const cloneCrumbs = primary.path.map((crumb) => ({ ...crumb }));
          const cloneEntries = primary.entries.map((entry) => ({ ...entry }));
          const cloneHistory = primary.history.map((entry) => ({
            handle: entry.handle,
            path: entry.path.map((crumb) => ({ ...crumb })),
          }));
          return [
            {
              ...primary,
              path: cloneCrumbs,
              entries: cloneEntries,
              history: cloneHistory,
            },
            {
              ...createPaneState(primary.dirHandle, cloneCrumbs),
              entries: cloneEntries,
              selection: primary.selection,
              history: cloneHistory,
              historyIndex: primary.historyIndex,
            },
          ];
        }
        return [existing[0] ?? createPaneState()];
      });
      if (!next) setActivePane(0);
      return next;
    });
  };

  if (!supported) {
    return (
      <div className="flex h-full flex-col gap-3 bg-[var(--kali-bg-solid)] p-4 text-[var(--kali-text)]">
        <input ref={fallbackInputRef} type="file" onChange={openFallback} className="hidden" />
        {!currentFile && (
          <button
            onClick={() => fallbackInputRef.current?.click()}
            className="self-start rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-xs uppercase tracking-wide text-white/80 transition hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
          >
            Open File
          </button>
        )}
        {currentFile && (
          <div className="flex h-full flex-col gap-3">
            <header className="text-xs uppercase tracking-wide text-white/60">{currentFile.name}</header>
            <textarea
              className="flex-1 rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] p-3 text-sm text-[var(--kali-text)] outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
              value={content}
              onChange={onChange}
            />
            <button
              onClick={async () => {
                const handle = await saveFileDialog({ suggestedName: currentFile.name });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
              }}
              className="self-start rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-xs uppercase tracking-wide text-white/80 transition hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
            >
              Save
            </button>
          </div>
        )}
      </div>
    );
  }

  const activePaneState = panes[activePane] ?? panes[0] ?? createPaneState();
  const canGoBack = activePaneState.historyIndex > 0;
  const canGoForward =
    activePaneState.historyIndex >= 0 &&
    activePaneState.historyIndex < activePaneState.history.length - 1;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--kali-bg-solid)] text-[var(--kali-text)] text-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/80 px-3 py-2">
        <button
          onClick={openFolder}
          className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-[var(--kali-panel-highlight)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
        >
          Open Folder
        </button>
        <button
          onClick={() => navigateHistory(activePane, -1)}
          disabled={!canGoBack}
          className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={() => navigateHistory(activePane, 1)}
          disabled={!canGoForward}
          className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Forward
        </button>
        <button
          onClick={toggleDualPane}
          className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
        >
          {dualPane ? 'Single Pane' : 'Dual Pane'}
        </button>
        {currentFile && (
          <button
            onClick={saveFile}
            className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-[var(--kali-panel-highlight)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
          >
            Save
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find in folder"
            className="w-40 rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-2 py-1 text-xs text-[var(--kali-text)] outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
          />
          <button
            onClick={runSearch}
            className="rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-[var(--kali-panel-highlight)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
          >
            Search
          </button>
        </div>
        {locationError && (
          <span className="w-full text-right text-xs text-red-300" role="status">
            {locationError}
          </span>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-56 flex-shrink-0 flex-col gap-4 border-r border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/60 p-3">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              Quick Places
            </h2>
            <ul className="space-y-1">
              {QUICK_PLACES.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => openQuickPlace(place)}
                    className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1 text-left text-sm transition hover:border-[var(--kali-panel-border)] hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
                  >
                    <img src={place.icon} alt="" className="h-5 w-5" />
                    <span className="truncate">{place.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="min-h-0 flex-1">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              Recent Locations
            </h2>
            <ul className="space-y-1 overflow-auto pr-1 text-sm">
              {recent.map((entry, index) => (
                <li key={`${entry.name}-${index}`}>
                  <button
                    type="button"
                    onClick={() => openRecent(entry)}
                    className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1 text-left transition hover:border-[var(--kali-panel-border)] hover:bg-[var(--kali-panel-highlight)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
                  >
                    <img src={getFolderIcon(entry.name)} alt="" className="h-5 w-5" />
                    <span className="truncate">{entry.name}</span>
                  </button>
                </li>
              ))}
              {!recent.length && (
                <li className="text-xs text-white/40">No recent directories</li>
              )}
            </ul>
          </section>
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden p-3">
          <div
            className={`grid gap-3 ${
              panesToRender.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {panesToRender.map((pane, index) => {
              const selection = pane.selection ?? -1;
              return (
                <section
                  key={`pane-${index}`}
                  className={`flex min-h-[220px] flex-col rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/70 ${
                    activePane === index ? 'ring-2 ring-[var(--kali-blue)]' : ''
                  }`}
                >
                  <header className="flex items-center justify-between gap-2 border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/60 px-3 py-2">
                    <FileBreadcrumbs
                      path={pane.path}
                      onNavigate={(crumbIndex) => handleBreadcrumbNavigate(index, crumbIndex)}
                    />
                    <span className="text-[10px] uppercase tracking-wide text-white/50">
                      {pane.entries.length} items
                    </span>
                  </header>
                  <div
                    ref={(el) => {
                      paneRefs.current[index] = el;
                    }}
                    tabIndex={0}
                    onFocus={() => setActivePane(index)}
                    onKeyDown={(event) => handlePaneKeyDown(event, index)}
                    className="flex-1 overflow-auto outline-none"
                  >
                    <ul className="divide-y divide-[var(--kali-panel-border)]/40">
                      {pane.entries.map((entry, entryIndex) => {
                        const isSelected = selection === entryIndex;
                        return (
                          <li key={`${entry.type}-${entry.name}-${entryIndex}`}>
                            <button
                              type="button"
                              onClick={() => handleEntryAction(index, entry, entryIndex)}
                              onFocus={() =>
                                setPanes((prev) => {
                                  const next = [...prev];
                                  if (next[index]) {
                                    next[index] = { ...next[index], selection: entryIndex };
                                  }
                                  return next;
                                })
                              }
                              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)] ${
                                isSelected
                                  ? 'bg-[var(--kali-panel-highlight)] text-white'
                                  : 'hover:bg-[var(--kali-panel-highlight)]/70'
                              }`}
                              aria-selected={isSelected}
                            >
                              <img src={entry.icon} alt="" className="h-6 w-6" />
                              <span className="truncate">{entry.name}</span>
                            </button>
                          </li>
                        );
                      })}
                      {!pane.entries.length && (
                        <li className="px-3 py-4 text-xs text-white/40">No items in this directory</li>
                      )}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-3 flex flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
            <section className="flex flex-1 flex-col rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/70">
              <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/60 px-3 py-2 text-xs uppercase tracking-wide text-white/60">
                {currentFile ? currentFile.name : 'Preview'}
              </header>
              {currentFile ? (
                <textarea
                  className="h-full min-h-[220px] w-full flex-1 resize-none bg-transparent p-3 text-sm text-[var(--kali-text)] outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
                  value={content}
                  onChange={onChange}
                />
              ) : (
                <p className="p-3 text-xs text-white/50">
                  Select a file to view its contents. Use Alt+Left/Right to move through history and Backspace to go up one level.
                </p>
              )}
            </section>
            <section className="flex w-full flex-col rounded border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/70 lg:w-80">
              <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/60 px-3 py-2 text-xs uppercase tracking-wide text-white/60">
                Search Results
              </header>
              <div className="flex-1 overflow-auto px-3 py-2 text-xs">
                {results.length === 0 && (
                  <p className="text-white/40">Use the search field above to scan files in the active pane.</p>
                )}
                <ul className="space-y-2">
                  {results.map((result, index) => (
                    <li key={`${result.file}-${result.line}-${index}`} className="rounded bg-[var(--kali-panel-highlight)]/40 p-2">
                      <div className="text-[var(--kali-blue)]">{result.file}</div>
                      <div className="text-white/70">Line {result.line}</div>
                      <pre className="mt-1 overflow-x-auto text-xs text-white/80">{result.text}</pre>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
