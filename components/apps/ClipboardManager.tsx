"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getDb } from '../../utils/safeIDB';
import config from '../../apps/clipboard_manager/clipman.json';

interface ClipItem {
  id?: number;
  text: string;
  created: number;
}

const DB_NAME = 'clipboard-manager';
const STORE_NAME = 'items';
const MAX_ITEMS = config.maxItems ?? 50;
const CLEAR_LABEL = config.clearLabel ?? 'Clear history';

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

  const truncateItems = useCallback(async (db: any) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    let cursor = await tx.store.openCursor();
    let count = await tx.store.count();
    while (cursor && count > MAX_ITEMS) {
      await cursor.delete();
      count--;
      cursor = await cursor.continue();
    }
    await tx.done;
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;
      await truncateItems(db);
      const all = await db.getAll(STORE_NAME);
      const sorted = all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setItems(sorted.slice(0, MAX_ITEMS));
    } catch {
      // ignore errors
    }
  }, [truncateItems]);

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
        await truncateItems(db);
        await loadItems();
      } catch {
        // ignore errors
      }
    },
    [loadItems, truncateItems]
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

  const writeToClipboard = async (text: string) => {
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-write' as any,
      });
      if (perm && perm.state === 'denied') return;
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Clipboard write failed:', err);
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

  return (
    <div className="p-4 space-y-2 text-white bg-ub-cool-grey h-full overflow-auto">
      <ul className="space-y-1">
        <li
          className="cursor-pointer text-red-400 hover:underline"
          onClick={clearHistory}
        >
          {CLEAR_LABEL}
        </li>
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

