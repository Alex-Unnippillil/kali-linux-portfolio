"use client";

import React, { useEffect, useState, useCallback } from 'react';
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

function detectType(text: string): 'url' | 'ip' | 'hash' | null {
  try {
    // Treat as valid URL if constructor succeeds
    new URL(text);
    return 'url';
  } catch {}
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(text)) return 'ip';
  if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(text)) return 'hash';
  return null;
}

const ClipboardManager: React.FC = () => {
  const [items, setItems] = useState<ClipItem[]>([]);

  const loadItems = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const all = await db.getAll(STORE_NAME);
      const sorted = all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      if (sorted.length > 20) {
        const toKeep = sorted.slice(0, 20);
        setItems(toKeep);
        const idsToDelete = sorted.slice(20).map((i) => i.id).filter(Boolean);
        const tx = db.transaction(STORE_NAME, 'readwrite');
        idsToDelete.forEach((id) => tx.store.delete(id!));
        await tx.done;
      } else {
        setItems(sorted);
      }
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
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
        onClick={clearHistory}
      >
        Clear History
      </button>
      <ul className="space-y-1">
        {items.map((item) => {
          const type = detectType(item.text);
          const openUrl = () => {
            const url = type === 'ip' ? `http://${item.text}` : item.text;
            window.open(url, '_blank');
          };
          const copyCurl = () => {
            const url = type === 'ip' ? `http://${item.text}` : item.text;
            writeToClipboard(`curl ${url}`);
          };
          const searchHash = () => {
            window.open(`https://www.google.com/search?q=${item.text}`, '_blank');
          };
          return (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span
                className="flex-1 cursor-pointer hover:underline"
                onClick={() => writeToClipboard(item.text)}
              >
                {item.text}
              </span>
              {type === 'url' && (
                <>
                  <button
                    className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600"
                    onClick={openUrl}
                  >
                    Open
                  </button>
                  <button
                    className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600"
                    onClick={copyCurl}
                  >
                    Copy as cURL
                  </button>
                </>
              )}
              {type === 'ip' && (
                <>
                  <button
                    className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600"
                    onClick={openUrl}
                  >
                    Open
                  </button>
                  <button
                    className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600"
                    onClick={copyCurl}
                  >
                    Copy as cURL
                  </button>
                </>
              )}
              {type === 'hash' && (
                <button
                  className="px-1 py-0.5 bg-gray-700 hover:bg-gray-600"
                  onClick={searchHash}
                >
                  Search
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

