"use client";

import React, { useCallback, useEffect, useState } from 'react';
import HistoryOverlay from './ClipboardManager/HistoryOverlay';
import { detectSensitiveContent } from '../../utils/redaction';
import { ensureObjectStore, getDb } from '../../utils/safeIDB';

export interface ClipItem {
  id?: number;
  text: string;
  created: number;
  pinned?: boolean;
}

export const CLIPBOARD_DB_NAME = 'clipboard-manager';
export const CLIPBOARD_STORE_NAME = 'items';
export const CLIPBOARD_DB_VERSION = 2;
export const CLIPBOARD_CREATED_INDEX = 'by-created';
export const CLIPBOARD_PINNED_INDEX = 'by-pinned';
export const MAX_CLIPBOARD_ITEMS = 25;
export const CLIPBOARD_RETENTION_MS = 24 * 60 * 60 * 1000;

let dbPromise: ReturnType<typeof getDb> | null = null;

export function getClipboardDb() {
  if (!dbPromise) {
    dbPromise = getDb(CLIPBOARD_DB_NAME, CLIPBOARD_DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        ensureObjectStore(
          db as any,
          transaction as any,
          CLIPBOARD_STORE_NAME,
          { keyPath: 'id', autoIncrement: true },
          [
            { name: CLIPBOARD_CREATED_INDEX, keyPath: 'created' },
            { name: CLIPBOARD_PINNED_INDEX, keyPath: 'pinned' },
          ],
        );
      },
    });
  }

  return dbPromise;
}

export function resetClipboardDbCache() {
  dbPromise = null;
}

export async function closeClipboardDb() {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    db?.close?.();
  } catch {
    // ignore close failures in tests
  } finally {
    dbPromise = null;
  }
}

function normalizeItem(item: ClipItem): ClipItem {
  return {
    id: item.id,
    text: item.text,
    created: item.created,
    pinned: Boolean(item.pinned),
  };
}

const ClipboardManager: React.FC = () => {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadItems = useCallback(async () => {
    try {
      const dbp = getClipboardDb();
      if (!dbp) {
        setItems([]);
        return;
      }

      const db = await dbp;
      const tx = db.transaction(CLIPBOARD_STORE_NAME, 'readwrite');
      const store = tx.store;
      const index = store.index(CLIPBOARD_CREATED_INDEX);
      const records = await index.getAll();
      const now = Date.now();
      const preserved: ClipItem[] = [];
      const toDelete: number[] = [];
      let unpinnedCount = 0;

      for (let i = records.length - 1; i >= 0; i -= 1) {
        const record = records[i];
        const created = typeof record.created === 'number' ? record.created : 0;
        const pinned = Boolean(record.pinned);
        const id = record.id;

        if (!pinned && now - created > CLIPBOARD_RETENTION_MS) {
          if (typeof id === 'number') {
            toDelete.push(id);
          }
          continue;
        }

        if (!pinned && unpinnedCount >= MAX_CLIPBOARD_ITEMS) {
          if (typeof id === 'number') {
            toDelete.push(id);
          }
          continue;
        }

        preserved.push(
          normalizeItem({
            id,
            text: record.text,
            created,
            pinned,
          }),
        );

        if (!pinned) {
          unpinnedCount += 1;
        }
      }

      for (const id of toDelete) {
        await store.delete(id);
      }

      await tx.done;

      preserved.sort((a, b) => b.created - a.created);
      setItems(preserved);
    } catch (error) {
      console.error('Failed to load clipboard history', error);
    }
  }, []);

  const addItem = useCallback(
    async (text: string) => {
      if (!text) return;
      const detection = detectSensitiveContent(text);
      if (detection.hasMatch) {
        const messages = detection.matches.length
          ? detection.matches.map((match) => `Filtered potential secret: ${match}`)
          : ['Filtered potential secret'];
        setWarnings((prev) => {
          const next = [...prev, ...messages];
          return next.slice(-5);
        });
        return;
      }

      try {
        const dbp = getClipboardDb();
        if (!dbp) return;
        const db = await dbp;
        const tx = db.transaction(CLIPBOARD_STORE_NAME, 'readwrite');
        await tx.store.add({ text, created: Date.now(), pinned: false });
        await tx.done;
        await loadItems();
      } catch (error) {
        console.error('Clipboard add failed:', error);
      }
    },
    [loadItems],
  );

  const captureClipboard = useCallback(async () => {
    try {
      const permissions = (navigator.permissions as any)?.query?.({
        name: 'clipboard-read' as PermissionName,
      });
      if (permissions) {
        const status = await permissions;
        if (status?.state === 'denied') {
          return;
        }
      }

      const text = await navigator.clipboard?.readText?.();
      if (!text) return;
      if (items[0]?.text === text) return;
      await addItem(text);
    } catch (error) {
      console.error('Clipboard read failed:', error);
    }
  }, [addItem, items]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    document.addEventListener('copy', captureClipboard);
    return () => document.removeEventListener('copy', captureClipboard);
  }, [captureClipboard]);

  const writeToClipboard = useCallback(async (text: string) => {
    try {
      const permissions = (navigator.permissions as any)?.query?.({
        name: 'clipboard-write' as PermissionName,
      });
      if (permissions) {
        const status = await permissions;
        if (status?.state === 'denied') {
          return;
        }
      }
      await navigator.clipboard?.writeText?.(text);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  }, []);

  const handleCopyItem = useCallback(
    (item: ClipItem) => {
      if (!item.text) return;
      void writeToClipboard(item.text);
    },
    [writeToClipboard],
  );

  const togglePin = useCallback(
    async (item: ClipItem) => {
      if (typeof item.id !== 'number') return;
      try {
        const dbp = getClipboardDb();
        if (!dbp) return;
        const db = await dbp;
        const tx = db.transaction(CLIPBOARD_STORE_NAME, 'readwrite');
        const current = await tx.store.get(item.id);
        if (current) {
          await tx.store.put({ ...current, pinned: !current.pinned });
        }
        await tx.done;
        await loadItems();
      } catch (error) {
        console.error('Failed to toggle pin state', error);
      }
    },
    [loadItems],
  );

  const clearHistory = useCallback(async () => {
    try {
      const dbp = getClipboardDb();
      if (!dbp) {
        setItems([]);
        return;
      }
      const db = await dbp;
      await db.clear(CLIPBOARD_STORE_NAME);
      setItems([]);
    } catch (error) {
      console.error('Failed to clear clipboard history', error);
    }
  }, []);

  return (
    <HistoryOverlay
      items={items}
      warnings={warnings}
      onClear={clearHistory}
      onCopy={handleCopyItem}
      onTogglePin={togglePin}
    />
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;
