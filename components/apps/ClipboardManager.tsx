"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getDb } from '../../utils/safeIDB';
import { consumeDesktopDrag, isDesktopDragEvent } from '../../utils/desktopDrag.js';

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
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState('');

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
      <div
        data-testid="clipboard-dropzone"
        className={`border-2 border-dashed rounded p-3 text-center transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-500 bg-opacity-10' : 'border-gray-500'
        }`}
        onDragEnter={(e) => {
          if (isDesktopDragEvent(e.dataTransfer)) {
            e.preventDefault();
            setDragActive(true);
          }
        }}
        onDragOver={(e) => {
          if (isDesktopDragEvent(e.dataTransfer)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!dragActive) setDragActive(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDragActive(false);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setDragActive(false);
          const payload = consumeDesktopDrag(e.dataTransfer);
          if (payload && payload.type === 'app') {
            await addItem(`[App] ${payload.title} (${payload.appId})`);
            setDropError('');
          } else {
            setDropError('Drop an app shortcut from the desktop to save a reference.');
          }
        }}
      >
        Drop an app icon here to save a quick reference
      </div>
      {dropError && (
        <p className="text-red-300 text-sm" role="alert">
          {dropError}
        </p>
      )}
      <button
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
        onClick={clearHistory}
      >
        Clear History
      </button>
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

