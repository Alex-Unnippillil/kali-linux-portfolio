"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getDb } from '../../utils/safeIDB';

interface ClipItem {
  id?: number;
  text: string;
  created: number;
}

const DB_NAME = 'clipboard-manager';
const STORE_NAME = 'items';

let dbPromise: ReturnType<typeof getDb> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported';

const formatPermissionState = (state: PermissionState) => {
  switch (state) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied';
    case 'prompt':
      return 'Permission needed';
    case 'unsupported':
      return 'Not supported';
    default:
      return 'Unavailable';
  }
};

const ClipboardManager: React.FC = () => {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const [readPermission, setReadPermission] = useState<PermissionState>('unknown');
  const [writePermission, setWritePermission] = useState<PermissionState>('unknown');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const all = await db.getAll(STORE_NAME);
      setItems(all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
    } catch {
      // ignore errors
    }
  }, []);

  const addItem = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        const dbp = getDB();
        if (!dbp) return;
        const db = await dbp;

        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.add({ text, created: Date.now() });
        await tx.done;
        await loadItems();
      } catch {
        // ignore errors
      }
    },
    [loadItems]
  );

  const evaluatePermissions = useCallback(async () => {
    setStatusMessage(null);
    const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard;
    setClipboardSupported(hasClipboard);

    if (!hasClipboard) {
      setReadPermission('unsupported');
      setWritePermission('unsupported');
      setStatusMessage('Clipboard API not supported. Use manual copy/paste shortcuts.');
      return;
    }

    const permissionsApi = (navigator.permissions as any)?.query;

    const queryPermission = async (
      name: 'clipboard-read' | 'clipboard-write',
      setter: React.Dispatch<React.SetStateAction<PermissionState>>
    ) => {
      if (!permissionsApi) {
        setter('unknown');
        return;
      }
      try {
        const descriptor = { name } as unknown as PermissionDescriptor;
        const status = await permissionsApi(descriptor);
        const state = (status?.state as PermissionState | undefined) ?? 'unknown';
        setter(state);
      } catch {
        setter('unknown');
      }
    };

    await Promise.all([
      queryPermission('clipboard-read', setReadPermission),
      queryPermission('clipboard-write', setWritePermission),
    ]);

    setStatusMessage('Clipboard permissions refreshed.');
  }, []);

  useEffect(() => {
    loadItems();
    evaluatePermissions();
  }, [loadItems, evaluatePermissions]);

  const handleCopy = useCallback(async () => {
    try {
      if (!clipboardSupported) {
        setStatusMessage('Clipboard API unavailable.');
        return;
      }
      if (readPermission === 'denied') {
        setStatusMessage('Clipboard read blocked. Update browser permissions and retry.');
        return;
      }
      const reader = navigator.clipboard?.readText;
      if (!reader) {
        setStatusMessage('Clipboard read unsupported in this browser.');
        return;
      }
      const text = await reader.call(navigator.clipboard);
      if (text && (!items[0] || items[0].text !== text)) {
        await addItem(text);
        setStatusMessage('Latest clipboard item saved.');
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
      setStatusMessage('Clipboard read failed. Check browser permissions.');
      evaluatePermissions();
    }
  }, [items, addItem, clipboardSupported, readPermission, evaluatePermissions]);

  useEffect(() => {
    if (!clipboardSupported || readPermission === 'denied') return undefined;
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy, clipboardSupported, readPermission]);

  const writeToClipboard = async (text: string) => {
    try {
      if (!clipboardSupported) {
        setStatusMessage('Clipboard API unavailable.');
        return;
      }
      if (writePermission === 'denied') {
        setStatusMessage('Clipboard write blocked. Update browser permissions and retry.');
        return;
      }
      const writer = navigator.clipboard?.writeText;
      if (!writer) {
        setStatusMessage('Clipboard write unsupported in this browser.');
        return;
      }
      await writer.call(navigator.clipboard, text);
      setStatusMessage('Copied to clipboard.');
    } catch (err) {
      console.error('Clipboard write failed:', err);
      setStatusMessage('Clipboard write failed. Check browser permissions.');
      evaluatePermissions();
    }
  };

  const clearHistory = async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      await db.clear(STORE_NAME);
      setItems([]);
    } catch {
      // ignore errors
    }
  };

  const statusSummary = useMemo(() => {
    if (!clipboardSupported) return 'Clipboard API unavailable';
    if (readPermission === 'denied' || writePermission === 'denied') return 'Clipboard access blocked';
    if (readPermission === 'granted' || writePermission === 'granted') return 'Clipboard ready';
    if (readPermission === 'prompt' || writePermission === 'prompt') return 'Permission required';
    return 'Waiting for browser signal';
  }, [clipboardSupported, readPermission, writePermission]);

  const summaryColor = useMemo(() => {
    if (!clipboardSupported || readPermission === 'denied' || writePermission === 'denied') return 'text-red-300';
    if (readPermission === 'granted' || writePermission === 'granted') return 'text-green-300';
    if (readPermission === 'prompt' || writePermission === 'prompt') return 'text-yellow-300';
    return 'text-blue-300';
  }, [clipboardSupported, readPermission, writePermission]);

  return (
    <div className="h-full overflow-auto bg-ub-cool-grey p-4 text-white space-y-4 sm:p-6">
      <div
        className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/90 p-4 shadow-inner"
        data-testid="clipboard-status"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Clipboard status</h2>
          <span
            className={`inline-flex items-center rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold tracking-wide ${summaryColor}`}
          >
            {statusSummary}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs sm:gap-4 sm:text-sm">
          <div className="space-y-1">
            <dt className="text-gray-400">Read</dt>
            <dd
              className="inline-flex items-center rounded-full border border-gray-600 bg-gray-700 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-100 shadow-sm"
              data-testid="clipboard-read-status"
            >
              {formatPermissionState(readPermission)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-gray-400">Write</dt>
            <dd
              className="inline-flex items-center rounded-full border border-gray-600 bg-gray-700 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-gray-100 shadow-sm"
              data-testid="clipboard-write-status"
            >
              {formatPermissionState(writePermission)}
            </dd>
          </div>
        </dl>
        {statusMessage && (
          <p className="rounded-md border border-blue-500/40 bg-blue-900/40 px-3 py-2 text-sm text-blue-200">
            {statusMessage}
          </p>
        )}
        {readPermission === 'denied' && (
          <p className="rounded-md border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            Clipboard read access is blocked. Allow clipboard permissions in your browser settings, then choose retry.
          </p>
        )}
        {writePermission === 'denied' && (
          <p className="rounded-md border border-red-500/40 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            Clipboard write access is blocked. Update browser permissions and retry before using history items.
          </p>
        )}
        {!clipboardSupported && (
          <p className="rounded-md border border-yellow-500/40 bg-yellow-900/40 px-3 py-2 text-sm text-yellow-200">
            This browser does not expose the asynchronous Clipboard API. Use manual copy/paste shortcuts instead.
          </p>
        )}
        <button
          className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-100 shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          onClick={evaluatePermissions}
        >
          Retry permission check
        </button>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">History</h3>
        <button
          className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-100 shadow-sm transition hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          onClick={clearHistory}
        >
          Clear history
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-left text-sm leading-relaxed text-gray-100 shadow-sm transition hover:border-blue-400 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
              onClick={() => writeToClipboard(item.text)}
            >
              {item.text}
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-gray-700/80 bg-gray-800/40 px-4 py-6 text-center text-sm text-gray-300">
            Clipboard history is empty. Copy something to store it here.
          </li>
        )}
      </ul>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

