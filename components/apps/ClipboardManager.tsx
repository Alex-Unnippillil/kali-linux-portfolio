"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getDb } from '../../utils/safeIDB';

interface ClipItem {
  id?: number;
  text: string;
  created: number;
  label?: string;
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [labelDrafts, setLabelDrafts] = useState<Record<number, string>>({});

  const loadItems = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const all = await db.getAll(STORE_NAME);
      const sorted = [...all].sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) {
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        }
        return (b.id ?? 0) - (a.id ?? 0);
      });
      setItems(sorted);
      setSelectedIds((prev) =>
        prev.filter((id) => sorted.some((item) => item.id === id))
      );
      setLabelDrafts((prev) => {
        const next: Record<number, string> = {};
        sorted.forEach((item) => {
          if (typeof item.id === 'number' && prev[item.id] !== undefined) {
            next[item.id] = prev[item.id];
          }
        });
        return next;
      });
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

  const updateItem = useCallback(
    async (id: number, updates: Partial<ClipItem>) => {
      try {
        const dbp = getDB();
        if (!dbp) return;
        const db = await dbp;

        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.store;
        const existing = await store.get(id);
        if (!existing) {
          await tx.done;
          return;
        }

        const updated: ClipItem = { ...existing, ...updates };
        if ('label' in updates && (!updates.label || updates.label.trim() === '')) {
          delete updated.label;
        }

        await store.put(updated);
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
      setSelectedIds([]);
      setLabelDrafts({});
    } catch {
      // ignore errors
    }
  };

  const togglePin = (item: ClipItem) => {
    if (typeof item.id !== 'number') return;
    void updateItem(item.id, { pinned: !item.pinned });
  };

  const handleLabelChange = (id: number, value: string) => {
    setLabelDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const commitLabel = async (id: number, value: string) => {
    const trimmed = value.trim();
    const existing = items.find((entry) => entry.id === id);
    if (existing && (existing.label ?? '') === trimmed) {
      setLabelDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    await updateItem(id, trimmed ? { label: trimmed } : { label: '' });
    setLabelDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleSelection = (id?: number) => {
    if (typeof id !== 'number') return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
  };

  const exportSelected = () => {
    if (typeof window === 'undefined') return;
    const createUrl = window.URL?.createObjectURL;
    const revokeUrl = window.URL?.revokeObjectURL;
    if (!createUrl) return;

    const selectedSet = new Set(selectedIds);
    const entries = items.filter(
      (item) => typeof item.id === 'number' && selectedSet.has(item.id)
    );
    if (entries.length === 0) return;

    const payload = entries.map((item) => ({
      id: item.id,
      text: item.text,
      created: item.created,
      ...(item.label ? { label: item.label } : {}),
      pinned: !!item.pinned,
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = createUrl(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    anchor.download = `clipboard-entries-${timestamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    revokeUrl?.(url);
  };

  const pinnedItems = items.filter((item) => item.pinned);
  const historyItems = items.filter((item) => !item.pinned);

  const renderEntry = (item: ClipItem) => {
    const id = item.id;
    const labelValue =
      typeof id === 'number'
        ? labelDrafts[id] !== undefined
          ? labelDrafts[id]
          : item.label ?? ''
        : item.label ?? '';
    return (
      <li
        key={item.id ?? item.created}
        data-testid="clipboard-entry"
        className="p-3 rounded bg-gray-800"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              aria-label={`Select ${item.label || item.text}`}
              className="mt-1"
              checked={typeof id === 'number' ? selectedIds.includes(id) : false}
              onChange={() => toggleSelection(id)}
            />
            <div className="flex-1 space-y-1">
              <input
                type="text"
                value={labelValue}
                placeholder="Add label"
                aria-label="entry label"
                className="w-full px-2 py-1 text-sm text-white bg-gray-700 rounded focus:outline-none focus:ring"
                onChange={(e) => {
                  if (typeof id === 'number') {
                    handleLabelChange(id, e.target.value);
                  }
                }}
                onBlur={() => {
                  if (typeof id === 'number') {
                    void commitLabel(id, labelValue);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && typeof id === 'number') {
                    event.preventDefault();
                    void commitLabel(id, labelValue);
                  }
                }}
              />
              <div className="text-xs text-gray-400">
                {new Date(item.created).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                aria-label={item.pinned ? 'unpin entry' : 'pin entry'}
                onClick={() => togglePin(item)}
              >
                {item.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                aria-label="copy entry"
                onClick={() => writeToClipboard(item.text)}
              >
                Copy
              </button>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap break-words">{item.text}</div>
        </div>
      </li>
    );
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex gap-2">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={clearHistory}
        >
          Clear History
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          onClick={exportSelected}
          disabled={selectedIds.length === 0}
        >
          Export Selected
        </button>
      </div>
      {pinnedItems.length > 0 && (
        <section className="space-y-2" data-testid="pinned-list">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-300">
            Pinned
          </h2>
          <ul className="space-y-2">{pinnedItems.map(renderEntry)}</ul>
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-300">
          History
        </h2>
        {historyItems.length > 0 ? (
          <ul className="space-y-2">{historyItems.map(renderEntry)}</ul>
        ) : (
          <div className="text-sm text-gray-300">No clipboard history yet.</div>
        )}
      </section>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

