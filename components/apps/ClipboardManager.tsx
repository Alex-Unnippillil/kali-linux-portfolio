"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { getDb } from '../../utils/safeIDB';
import {
  pruneSelection,
  replaceSelection,
  selectRange,
  toggleSelection,
} from '../../utils/selectionState';

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
  const [selection, setSelection] = useState<Set<number>>(() => new Set());
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

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

  const orderedIds = useMemo<(number | null)[]>(
    () => items.map((item) => (typeof item.id === 'number' ? item.id : null)),
    [items],
  );

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  useEffect(() => {
    setSelection((prev) =>
      pruneSelection(
        prev,
        items
          .map((item) => item.id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      setFocusedIndex(null);
      setAnchorIndex(null);
      return;
    }
    setFocusedIndex((index) => {
      if (index == null) return 0;
      if (index >= items.length) return items.length - 1;
      return index;
    });
    setAnchorIndex((index) => {
      if (index == null) return index;
      if (index >= items.length) return items.length - 1;
      return index;
    });
  }, [items]);

  useEffect(() => {
    if (focusedIndex == null) return;
    const node = itemRefs.current[focusedIndex];
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [focusedIndex, items]);

  const writeToClipboard = useCallback(async (text: string) => {
    try {
      const perm = await (navigator.permissions as any)?.query?.({
        name: 'clipboard-write' as any,
      });
      if (perm && perm.state === 'denied') return;
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }, []);

  const selectedItems = useMemo(
    () => items.filter((item) => typeof item.id === 'number' && selection.has(item.id)),
    [items, selection],
  );

  const handleCopySelected = useCallback(async () => {
    if (selectedItems.length === 0) return;
    const combined = selectedItems.map((item) => item.text).join('\n\n');
    await writeToClipboard(combined);
  }, [selectedItems, writeToClipboard]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedItems.length === 0) return;
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const ids = selectedItems
        .map((item) => item.id)
        .filter((id): id is number => typeof id === 'number');
      await Promise.all(ids.map((id) => tx.store.delete(id)));
      await tx.done;
      setSelection(new Set<number>());
      setAnchorIndex(null);
      setFocusedIndex(null);
      await loadItems();
    } catch {
      // ignore errors
    }
  }, [selectedItems, loadItems]);

  const clearHistory = useCallback(async () => {
    try {
      const dbp = getDB();
      if (!dbp) return;
      const db = await dbp;

      await db.clear(STORE_NAME);
      setItems([]);
      setSelection(new Set<number>());
      setAnchorIndex(null);
      setFocusedIndex(null);
    } catch {
      // ignore errors
    }
  }, []);

  const handleItemClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, item: ClipItem, index: number) => {
      const id = item.id;
      const isAdditive = event.metaKey || event.ctrlKey;
      const baseAnchor = anchorIndex ?? index;
      event.preventDefault();
      setFocusedIndex(index);
      if (event.shiftKey) {
        setSelection((prev) =>
          selectRange(prev, orderedIds, baseAnchor, index, { additive: isAdditive }),
        );
        setAnchorIndex(baseAnchor);
        return;
      }
      if (id == null) return;
      if (isAdditive) {
        setSelection((prev) => toggleSelection(prev, id));
        setAnchorIndex(index);
        return;
      }
      setSelection(replaceSelection(id));
      setAnchorIndex(index);
      void writeToClipboard(item.text);
    },
    [anchorIndex, orderedIds, writeToClipboard],
  );

  const handleItemKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, item: ClipItem, index: number) => {
      const id = item.id;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (items.length === 0) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(items.length - 1, index + delta));
        if (nextIndex === index) return;
        const baseAnchor = anchorIndex ?? index;
        if (event.shiftKey) {
          setSelection((prev) =>
            selectRange(prev, orderedIds, baseAnchor, nextIndex, { additive: true }),
          );
          setAnchorIndex(baseAnchor);
        }
        setFocusedIndex(nextIndex);
        if (!event.shiftKey) {
          const nextId = orderedIds[nextIndex];
          if (nextId != null) {
            setSelection(replaceSelection(nextId));
          } else {
            setSelection(new Set<number>());
          }
          setAnchorIndex(nextIndex);
        }
        return;
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        if (id == null) return;
        setSelection((prev) => toggleSelection(prev, id));
        setAnchorIndex(index);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (id == null) return;
        setSelection(replaceSelection(id));
        setAnchorIndex(index);
        void writeToClipboard(item.text);
      }
    },
    [anchorIndex, items.length, orderedIds, writeToClipboard],
  );

  return (
    <div className="p-4 space-y-3 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={clearHistory}
          type="button"
        >
          Clear History
        </button>
        {selection.size > 0 && (
          <>
            <span className="ml-1 text-sm text-gray-300">{selection.size} selected</span>
            <button
              type="button"
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={handleCopySelected}
            >
              Copy Selected
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </button>
          </>
        )}
      </div>
      <ul className="space-y-1" role="listbox" aria-multiselectable="true">
        {items.map((item, index) => {
          const id = item.id;
          const isSelected = typeof id === 'number' && selection.has(id);
          const isFocused = focusedIndex === index;
          return (
            <li key={id ?? index}>
              <div
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                role="option"
                className={`w-full cursor-pointer rounded border px-2 py-1 text-left transition focus:outline-none focus:ring-2 ${
                  isSelected
                    ? 'border-blue-400 bg-blue-500/40'
                    : 'border-transparent bg-gray-800 hover:bg-gray-700'
                }`}
                tabIndex={isFocused || (focusedIndex == null && index === 0) ? 0 : -1}
                aria-selected={isSelected}
                onClick={(event) => handleItemClick(event, item, index)}
                onKeyDown={(event) => handleItemKeyDown(event, item, index)}
                onDoubleClick={() => writeToClipboard(item.text)}
              >
                <span className="block truncate text-sm">{item.text}</span>
                <span className="mt-1 block text-xs text-gray-300">
                  {new Date(item.created).toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

