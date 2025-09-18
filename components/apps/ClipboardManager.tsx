"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
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

const createEphemeralItem = (text: string): ClipItem => {
  const timestamp = Date.now();
  return { id: timestamp + Math.random(), text, created: timestamp };
};

type PermissionStatusState = PermissionState | 'unknown';

interface ClipboardManagerProps {
  nav?: Navigator | null;
}

const ClipboardManager: React.FC<ClipboardManagerProps> = ({ nav }) => {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [privacyMode, setPrivacyMode] = usePersistentState<boolean>(
    'clipboard:privacy-mode',
    false,
  );
  const [permissionState, setPermissionState] = useState<PermissionStatusState>(
    'unknown',
  );
  const navigatorRef = useMemo(
    () => nav ?? (typeof window !== 'undefined' ? window.navigator : undefined),
    [nav],
  );

  const loadItems = useCallback(async () => {
    if (privacyMode) {
      setItems([]);
      return;
    }
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const all = await db.getAll(STORE_NAME);
      setItems(all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
    } catch {
      // ignore errors
    }
  }, [privacyMode]);

  const addItem = useCallback(
    async (text: string) => {
      if (!text) return;
      if (privacyMode) {
        setItems((prev) => {
          if (prev[0]?.text === text) return prev;
          return [createEphemeralItem(text), ...prev];
        });
        return;
      }
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
    [privacyMode, loadItems],
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const checkReadPermission = useCallback(async () => {
    try {
      if (!navigatorRef) {
        setPermissionState('unknown');
        return 'unknown';
      }
      const permissions = navigatorRef.permissions;
      if (!permissions?.query) {
        setPermissionState('unknown');
        return 'unknown';
      }
      const status = await permissions.query({
        name: 'clipboard-read' as PermissionName,
      } as PermissionDescriptor);
      setPermissionState(status.state);
      return status.state;
    } catch {
      setPermissionState('unknown');
      return 'unknown';
    }
  }, [navigatorRef]);

  useEffect(() => {
    void checkReadPermission();
  }, [checkReadPermission]);

  const readClipboard = useCallback(async () => {
    try {
      const perm = await checkReadPermission();
      if (perm === 'denied') {
        return;
      }
      const clipboard = navigatorRef?.clipboard;
      if (!clipboard?.readText) {
        console.error('Clipboard API not available');
        return;
      }
      const text = await clipboard.readText();
      if (text && (!items[0] || items[0].text !== text)) {
        await addItem(text);
      }
      setPermissionState('granted');
    } catch (err) {
      if ((err as DOMException)?.name === 'NotAllowedError') {
        setPermissionState('denied');
      }
      console.error('Clipboard read failed:', err);
    }
  }, [items, addItem, checkReadPermission]);

  const handleCopy = useCallback(() => {
    void readClipboard();
  }, [readClipboard]);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  const writeToClipboard = useCallback(
    async (text: string) => {
      try {
        const permissions = navigatorRef?.permissions;
        const perm = await permissions?.query?.({
          name: 'clipboard-write' as PermissionName,
        } as PermissionDescriptor);
        if (perm && perm.state === 'denied') return;
        const clipboard = navigatorRef?.clipboard;
        if (!clipboard?.writeText) {
          console.error('Clipboard API not available');
          return;
        }
        await clipboard.writeText(text);
      } catch (err) {
        console.error('Clipboard write failed:', err);
      }
    },
    [navigatorRef],
  );

  const clearHistory = async () => {
    if (privacyMode) {
      setItems([]);
      return;
    }
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

  return (
    <div className="p-4 space-y-3 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={clearHistory}
        >
          Clear History
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={privacyMode}
            onChange={(event) => setPrivacyMode(event.target.checked)}
          />
          Privacy mode
        </label>
        {privacyMode && (
          <span className="text-xs text-gray-300">
            Clipboard entries stay in-memory only.
          </span>
        )}
      </div>
      {permissionState === 'denied' && (
        <div className="space-y-2 rounded border border-red-500/40 bg-red-900/40 p-3 text-sm">
          <p>Clipboard access is blocked. Enable permissions to capture entries.</p>
          <button
            className="px-2 py-1 bg-red-700 hover:bg-red-600"
            onClick={() => void readClipboard()}
          >
            Retry clipboard access
          </button>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="cursor-pointer hover:underline"
            onClick={() => writeToClipboard(item.text)}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

