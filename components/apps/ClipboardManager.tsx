"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const ClipboardManager: React.FC = () => {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [toast, setToast] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast('');
      toastTimeoutRef.current = null;
    }, 2000);
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

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCopy = useCallback(async () => {
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-read' as any,
      });
      if (perm && perm.state === 'denied') return;
      const text = await navigator.clipboard.readText();
      if (text && (!items[0] || items[0].text !== text)) {
        await addItem(text);
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
    }
  }, [items, addItem]);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  const writeToClipboard = useCallback(async (text: string) => {
    if (!text) return false;
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-write' as any,
      });
      if (perm && perm.state === 'denied') return false;
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard write failed:', err);
      return false;
    }
  }, []);

  const insertTextIntoElement = useCallback((element: Element, text: string) => {
    if (!text) return false;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? element.value.length;
      const nextValue = element.value.slice(0, start) + text + element.value.slice(end);
      element.value = nextValue;
      const cursor = start + text.length;
      if (typeof element.setSelectionRange === 'function') {
        element.setSelectionRange(cursor, cursor);
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (element instanceof HTMLElement && element.isContentEditable) {
      if (typeof document.execCommand === 'function') {
        return document.execCommand('insertText', false, text);
      }
      element.innerText += text;
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleShortcut = async (event: KeyboardEvent) => {
      if (!rootRef.current || !event.altKey || event.key.toLowerCase() !== 'v') return;

      const windowEl = rootRef.current.closest('.opened-window');
      if (windowEl && windowEl.classList.contains('notFocused')) return;

      const latest = items[0];
      if (!latest) {
        showToast('Clipboard history is empty');
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (!active || !rootRef.current.contains(active)) {
        showToast('Focus a target field to paste');
        return;
      }

      event.preventDefault();

      const wrote = await writeToClipboard(latest.text);
      const inserted = insertTextIntoElement(active, latest.text);

      if (wrote && inserted) {
        showToast('Pasted last entry');
      } else if (!wrote) {
        showToast('Clipboard unavailable');
      } else {
        showToast('Unable to paste into the selected field');
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [items, insertTextIntoElement, showToast, writeToClipboard]);

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

  return (
    <div
      ref={rootRef}
      className="p-4 space-y-3 text-white bg-ub-cool-grey h-full overflow-auto"
    >
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
        onClick={clearHistory}
      >
        Clear History
      </button>
      <div>
        <label htmlFor="clipboard-target" className="block text-sm font-semibold">
          Paste target
        </label>
        <textarea
          id="clipboard-target"
          data-testid="clipboard-target"
          className="mt-1 w-full rounded border border-white/20 bg-black/40 p-2 text-white focus:outline-none focus:ring focus:ring-blue-500/40"
          placeholder="Focus this field and press Alt+V to paste the most recent entry"
          rows={4}
        />
        <p className="mt-1 text-xs text-gray-300">
          Tip: copy content to build history, then use Alt+V to paste the latest entry.
        </p>
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="clipboard-toast"
          className="rounded bg-black/40 px-2 py-1 text-sm text-green-300"
        >
          {toast}
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

