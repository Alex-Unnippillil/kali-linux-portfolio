"use client";

import React, { useEffect, useState, useCallback } from 'react';
import WindowedList from './windowed-list';
import { getDb } from '../../utils/safeIDB';

interface ClipItem {
  id?: number;
  text: string;
  created: number;
  pinned?: boolean;
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'url' | 'hash'>('all');
  const [permissionNeeded, setPermissionNeeded] = useState(false);

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const isHash = (text: string) => /^[a-fA-F0-9]{32,64}$/.test(text);

  const loadItems = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const all = await db.getAll(STORE_NAME);
      all.sort((a, b) => {
        if (!!a.pinned === !!b.pinned) return (b.id ?? 0) - (a.id ?? 0);
        return a.pinned ? -1 : 1;
      });
      setItems(all);
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
        await tx.store.add({ text, created: Date.now(), pinned: false });
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
      if (perm && perm.state === 'denied') {
        setPermissionNeeded(true);
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text && (!items[0] || items[0].text !== text)) {
        await addItem(text);
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
      setPermissionNeeded(true);
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
      if (perm && perm.state === 'denied') {
        setPermissionNeeded(true);
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Clipboard write failed:', err);
      setPermissionNeeded(true);
    }
  };

  const togglePin = async (item: ClipItem) => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.store.put({ ...item, pinned: !item.pinned });
      await tx.done;
      await loadItems();
    } catch {
      // ignore errors
    }
  };

  const clearHistory = async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const all = await tx.store.getAll();
      await Promise.all(
        all.filter((item) => !item.pinned).map((item) => tx.store.delete(item.id!))
      );
      await tx.done;
      setItems(all.filter((item) => item.pinned));
    } catch {
      // ignore errors
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.text
      .toLowerCase()
      .includes(search.toLowerCase());
    let matchesType = true;
    if (typeFilter === 'url') matchesType = isUrl(item.text);
    else if (typeFilter === 'hash') matchesType = isHash(item.text);
    else if (typeFilter === 'text')
      matchesType = !isUrl(item.text) && !isHash(item.text);
    return matchesSearch && matchesType;
  });

  const requestClipboardAccess = async () => {
    try {
      await navigator.clipboard.readText();
      setPermissionNeeded(false);
    } catch {
      setPermissionNeeded(true);
    }
  };

  useEffect(() => {
    (navigator.permissions as any)
      ?.query?.({ name: 'clipboard-read' as any })
      .then((perm: any) => {
        if (perm && perm.state === 'denied') setPermissionNeeded(true);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-4 space-y-2 text-white bg-ub-cool-grey h-full flex flex-col">
      {permissionNeeded && (
        <div className="mb-2 p-2 bg-red-800 text-center" role="alert">
          Permission needed to access clipboard.
          <button className="ml-2 underline" onClick={requestClipboardAccess}>
            Grant Access
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
          onClick={clearHistory}
        >
          Clear History
        </button>
        <input
          className="px-2 py-1 bg-gray-700"
          placeholder="Search"
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-2 py-1 bg-gray-700"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as 'all' | 'text' | 'url' | 'hash')
          }
          aria-label="Type filter"
        >
          <option value="all">All</option>
          <option value="text">Text</option>
          <option value="url">URL</option>
          <option value="hash">Hash</option>
        </select>
      </div>
      <WindowedList
        className="flex-1 space-y-1"
        items={filteredItems}
        itemHeight={32}
        itemKey={(index, item) => item.id ?? index}
        renderItem={(item) => (
          <div
            key={item.id}
            className="flex items-center cursor-pointer hover:underline px-1"
            onClick={() => writeToClipboard(item.text)}
          >
            <span className="flex-1">{item.text}</span>
            <button
              className="ml-2"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(item);
              }}
              aria-label={item.pinned ? 'Unpin' : 'Pin'}
            >
              {item.pinned ? '★' : '☆'}
            </button>
          </div>
        )}
      />
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

