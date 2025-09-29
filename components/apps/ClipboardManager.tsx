"use client";

import React, { useEffect, useState, useCallback, useId } from 'react';
import { getDb } from '../../utils/safeIDB';
import useNotifications from '../../hooks/useNotifications';

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

const ClipboardManager: React.FC = () => {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = useId();
  const liveRegionId = useId();
  const { pushNotification } = useNotifications();

  const announce = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAnnouncement(`${message} (${timestamp})`);
  }, []);

  const notify = useCallback(
    (title: string, body: string, priority: 'normal' | 'low' = 'normal') => {
      pushNotification({
        appId: 'clipboard-manager',
        title,
        body,
        priority,
        hints: {
          'x-kali-channel': 'clipboard',
        },
      });
    },
    [pushNotification],
  );

  const previewText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length <= 60) return trimmed;
    return `${trimmed.slice(0, 57)}…`;
  }, []);

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
      if (!text) return false;
      try {
        const dbp = getDB();
        if (!dbp) return false;
        const db = await dbp;

        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.add({ text, created: Date.now() });
        await tx.done;
        await loadItems();
        const preview = previewText(text);
        notify('Clipboard item saved', preview, 'low');
        announce(`Saved clipboard item ${preview || 'from system clipboard'}`);
        return true;
      } catch {
        // ignore errors
        return false;
      }
    },
    [announce, loadItems, notify, previewText],
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCopy = useCallback(async () => {
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-read' as any,
      });
      if (perm && perm.state === 'denied') {
        notify('Clipboard capture blocked', 'Clipboard read permission denied.', 'normal');
        announce('Clipboard capture denied');
        return;
      }
      if (!navigator.clipboard?.readText) {
        notify('Clipboard capture unavailable', 'Clipboard API is not supported in this browser.', 'normal');
        announce('Clipboard capture unavailable');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && (!items[0] || items[0].text !== text)) {
        const saved = await addItem(text);
        if (!saved) {
          notify('Clipboard capture failed', 'Permission denied or clipboard unavailable.', 'normal');
          announce('Clipboard capture failed');
        }
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
      notify('Clipboard capture failed', 'Clipboard access is blocked.', 'normal');
      announce('Clipboard capture failed');
    }
  }, [announce, items, addItem, notify]);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  const writeToClipboard = async (text: string) => {
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-write' as any,
      });
      if (perm && perm.state === 'denied') {
        notify('Copy blocked', 'Clipboard write permission denied.', 'normal');
        announce('Copy to clipboard blocked');
        return;
      }
      if (!navigator.clipboard?.writeText) {
        notify('Copy unavailable', 'Clipboard API is not supported in this browser.', 'normal');
        announce('Copy to clipboard unavailable');
        return;
      }
      await navigator.clipboard.writeText(text);
      const preview = previewText(text);
      notify('Copied to clipboard', preview, 'low');
      announce(`Copied clipboard item ${preview || 'to system clipboard'}`);
    } catch (err) {
      console.error('Clipboard write failed:', err);
      notify('Copy failed', 'Unable to write to the clipboard.', 'normal');
      announce('Copy to clipboard failed');
    }
  };

  const clearHistory = async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      await db.clear(STORE_NAME);
      setItems([]);
      notify('Clipboard history cleared', 'All stored snippets were removed.', 'normal');
      announce('Clipboard history cleared');
    } catch {
      // ignore errors
    }
  };

  return (
    <div className="p-4 space-y-3 text-white bg-ub-cool-grey h-full overflow-auto" aria-labelledby={instructionsId}>
      <p id={instructionsId} className="text-xs text-gray-300">
        Keyboard: Focus a snippet and press Enter or Space to copy it. Use the Clear History button to remove all snippets.
      </p>
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
        onClick={clearHistory}
      >
        Clear History
      </button>
      <div id={liveRegionId} aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="cursor-pointer"
          >
            <button
              type="button"
              onClick={() => writeToClipboard(item.text)}
              className="w-full text-left hover:underline focus:outline-none focus-visible:ring focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 focus-visible:ring-sky-400 rounded px-1"
            >
              <span className="block break-words">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

