'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

const STACKBLITZ_ORIGIN = 'https://stackblitz.com';
const OFFLINE_NAMESPACE = 'vscode';
const OFFLINE_DIRECTORY = 'offline';

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

// Static files that can be opened directly in a new tab
const files = ['README.md', 'CHANGELOG.md', 'package.json'];

export default function VsCodeWrapper({ openApp }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.navigator?.onLine ?? true;
  });
  const [offlineEdits, setOfflineEdits] = useState({});
  const actionQueueRef = useRef([]);
  const frameWindowRef = useRef(null);
  const offlineDirectoryRef = useRef(null);
  const offlineSnapshotRef = useRef(false);

  const items = useMemo(() => {
    const list = [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  const ensureOfflineDirectory = useCallback(async () => {
    if (offlineDirectoryRef.current) return offlineDirectoryRef.current;
    if (typeof window === 'undefined') return null;
    const { navigator } = window;
    if (!navigator?.storage?.getDirectory) return null;

    try {
      const rootHandle = await navigator.storage.getDirectory();
      const vscodeDir = await rootHandle.getDirectoryHandle(OFFLINE_NAMESPACE, { create: true });
      const offlineDir = await vscodeDir.getDirectoryHandle(OFFLINE_DIRECTORY, { create: true });
      offlineDirectoryRef.current = offlineDir;
      return offlineDir;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to access OPFS for VSCode offline storage', error);
      return null;
    }
  }, []);

  const getStackBlitzWindow = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (frameWindowRef.current?.postMessage) return frameWindowRef.current;
    const frame = document.querySelector('iframe[title="VsCode"]');
    if (frame?.contentWindow?.postMessage) {
      frameWindowRef.current = frame.contentWindow;
      return frameWindowRef.current;
    }
    return null;
  }, []);

  const persistOfflineEdit = useCallback(
    async ({ path, content }) => {
      if (!path) return;
      const offlineDir = await ensureOfflineDirectory();
      if (!offlineDir) return;

      try {
        const segments = path.split('/').filter(Boolean);
        const fileName = segments.pop() ?? path;
        let workingDir = offlineDir;
        for (const segment of segments) {
          workingDir = await workingDir.getDirectoryHandle(segment, { create: true });
        }
        const fileHandle = await workingDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(typeof content === 'string' ? content : JSON.stringify(content));
        await writable.close();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist offline edit', error);
      }
    },
    [ensureOfflineDirectory],
  );

  const readOfflineEdits = useCallback(async () => {
    const offlineDir = await ensureOfflineDirectory();
    if (!offlineDir?.entries) return {};

    const edits = {};

    const walkDirectory = async (directoryHandle, prefix = '') => {
      // eslint-disable-next-line no-restricted-syntax
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          const text = await file.text();
          edits[`${prefix}${name}`] = text;
        } else if (handle.kind === 'directory') {
          await walkDirectory(handle, `${prefix}${name}/`);
        }
      }
    };

    await walkDirectory(offlineDir);
    return edits;
  }, [ensureOfflineDirectory]);

  const clearOfflineEdits = useCallback(async () => {
    const offlineDir = await ensureOfflineDirectory();
    if (!offlineDir?.entries || typeof offlineDir.removeEntry !== 'function') return;
    const removals = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const [name, handle] of offlineDir.entries()) {
      if (handle.kind === 'file') {
        removals.push(offlineDir.removeEntry(name));
      } else if (handle.kind === 'directory') {
        removals.push(offlineDir.removeEntry(name, { recursive: true }));
      }
    }
    await Promise.allSettled(removals);
  }, [ensureOfflineDirectory]);

  const flushQueue = useCallback(
    async () => {
      if (!isOnline || actionQueueRef.current.length === 0) return;
      const bridgeTarget = getStackBlitzWindow() || (typeof window !== 'undefined' ? window : null);
      if (!bridgeTarget?.postMessage) return;

      while (actionQueueRef.current.length > 0) {
        const action = actionQueueRef.current.shift();
        bridgeTarget.postMessage(action, STACKBLITZ_ORIGIN);
      }
      if (offlineSnapshotRef.current) {
        offlineSnapshotRef.current = false;
        await clearOfflineEdits();
      }
    },
    [clearOfflineEdits, getStackBlitzWindow, isOnline],
  );

  const sendStackBlitzAction = useCallback(
    (action) => {
      if (!action) return;
      if (isOnline) {
        const bridgeTarget = getStackBlitzWindow() || (typeof window !== 'undefined' ? window : null);
        if (bridgeTarget?.postMessage) {
          bridgeTarget.postMessage(action, STACKBLITZ_ORIGIN);
          return;
        }
      }
      actionQueueRef.current.push(action);
    },
    [getStackBlitzWindow, isOnline],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const handleOnline = () => setIsOnline(window.navigator?.onLine ?? true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(window.navigator?.onLine ?? true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return undefined;
    let cancelled = false;
    const sync = async () => {
      if (cancelled) return;
      await flushQueue();
    };
    sync();
    return () => {
      cancelled = true;
    };
  }, [flushQueue, isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const frame = document.querySelector('iframe[title="VsCode"]');
    if (!frame) return () => {};

    const updateFrameRef = () => {
      if (frame.contentWindow?.postMessage) {
        frameWindowRef.current = frame.contentWindow;
        if (isOnline) {
          flushQueue();
        }
      }
    };

    updateFrameRef();
    frame.addEventListener('load', updateFrameRef);
    return () => frame.removeEventListener('load', updateFrameRef);
  }, [flushQueue, isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => {};
    const handler = (event) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'stackblitz:unsynced-edit') {
        const { path, content } = data.payload || {};
        if (!path) return;
        setOfflineEdits((prev) => ({ ...prev, [path]: content ?? '' }));
        persistOfflineEdit({ path, content: content ?? '' }).catch(() => {});
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [persistOfflineEdit]);

  useEffect(() => {
    let cancelled = false;
    if (!isOnline) {
      const load = async () => {
        const edits = await readOfflineEdits().catch(() => ({}));
        if (cancelled) return;
        if (Object.keys(edits).length > 0) {
          offlineSnapshotRef.current = true;
          setOfflineEdits(edits);
          actionQueueRef.current.push(
            ...Object.entries(edits).map(([path, content]) => ({
              type: 'stackblitz:apply-offline-edit',
              payload: { path, content },
            })),
          );
        } else {
          setOfflineEdits({});
        }
      };
      load();
    } else {
      offlineSnapshotRef.current = false;
      setOfflineEdits({});
    }

    return () => {
      cancelled = true;
    };
  }, [isOnline, readOfflineEdits]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectItem = useCallback(
    (item) => {
      setVisible(false);
      setQuery('');
      if (item.type === 'app' && openApp) {
        openApp(item.id);
      } else if (item.type === 'file') {
        sendStackBlitzAction({
          type: 'stackblitz:open-resource',
          payload: { path: item.id },
        });
        if (typeof window !== 'undefined') {
          window.open(item.id, '_blank');
        }
      }
    },
    [openApp, sendStackBlitzAction],
  );

  const offlineBannerVisible = !isOnline;
  const offlineEditsEntries = useMemo(() => Object.entries(offlineEdits), [offlineEdits]);

  const OfflineBanner = ({ hasOfflineEdits }) => (
    <div
      role="status"
      aria-live="polite"
      aria-label="Offline status"
      className="absolute left-0 right-0 top-0 z-50 flex flex-col gap-1 bg-amber-500 px-4 py-3 text-sm font-medium text-black shadow"
    >
      <span>You are offline. Changes will sync once the connection is restored.</span>
      {hasOfflineEdits && <span className="text-xs uppercase">Unsynced edits saved locally</span>}
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {offlineBannerVisible && <OfflineBanner hasOfflineEdits={offlineEditsEntries.length > 0} />}
      <VsCode />
      {visible && (
        <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/50">
          <div className="bg-gray-800 text-white w-11/12 max-w-md rounded shadow-lg p-2">
            <input
              autoFocus
              className="w-full p-2 mb-2 bg-gray-700 rounded outline-none"
              placeholder="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
      {!isOnline && offlineEditsEntries.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-11/12 max-w-xl -translate-x-1/2 rounded-md bg-black/80 p-4 text-xs text-white shadow-lg">
          <h2 className="mb-2 text-sm font-semibold">Offline changes</h2>
          <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {offlineEditsEntries.map(([path, content]) => (
              <li key={path} className="rounded border border-white/10 p-2">
                <p className="mb-1 text-[11px] font-semibold uppercase text-amber-200">{path}</p>
                <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-white/80">
                  {content}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;

