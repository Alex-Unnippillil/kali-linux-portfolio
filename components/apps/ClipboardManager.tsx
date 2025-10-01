"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PermissionPrompt from '../common/PermissionPrompt';
import { usePermissionPrompt } from '../../hooks/usePermissionPrompt';
import { getDb } from '../../utils/safeIDB';
import type { PermissionPromptReason } from '../../hooks/usePermissionPrompt';

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
  const { prompt, requestPermission, resolvePermission } = usePermissionPrompt();

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

  const readClipboard = useCallback(async () => {
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

  const readReasons: PermissionPromptReason[] = useMemo(
    () => [
      {
        title: 'Capture copies automatically',
        description:
          'Each time you copy text, the clipboard manager records it locally so you can quickly reuse it.',
      },
      {
        title: 'Keep history on this device',
        description:
          'Clipboard entries never leave your browser — they are stored in IndexedDB for your private reference.',
      },
    ],
    [],
  );

  const clipboardPreview = useMemo(
    () => (
      <div className="space-y-2 text-xs text-gray-200">
        <div className="font-semibold text-white">Clipboard history</div>
        <div className="rounded border border-gray-700 bg-gray-800/80 p-2">
          Most recent copy will appear here automatically.
        </div>
        <div className="rounded border border-gray-700 bg-gray-800/40 p-2 text-gray-400">
          Older snippets stay available for one-click reuse.
        </div>
      </div>
    ),
    [],
  );

  const handleCopy = useCallback(() => {
    const result = requestPermission({
      permission: 'clipboard-read',
      title: 'Allow Clipboard Manager to read your clipboard?',
      summary:
        'Clipboard Manager watches for new copy events so your recent snippets stay available in one place.',
      reasons: readReasons,
      preview: clipboardPreview,
      confirmLabel: 'Allow clipboard access',
      declineLabel: 'Not now',
      onAllow: () => readClipboard(),
    });

    if (result.status === 'blocked') {
      console.info('Clipboard read permission prompt snoozed.');
    }
  }, [clipboardPreview, readClipboard, readReasons, requestPermission]);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  const performClipboardWrite = useCallback(async (text: string) => {
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

  const writeReasons: PermissionPromptReason[] = useMemo(
    () => [
      {
        title: 'Copy saved items back',
        description:
          'Selecting an entry needs permission to push that text back into your system clipboard instantly.',
      },
      {
        title: 'Respect your privacy',
        description:
          'We never send clipboard contents to servers — writing happens locally for your selected item only.',
      },
    ],
    [],
  );

  const handleWrite = useCallback(
    (text: string) => {
      if (!text) return;
      const snippet = text.length > 140 ? `${text.slice(0, 140)}…` : text;
      const preview = (
        <div className="space-y-2 text-sm text-gray-200">
          <div className="font-semibold text-white">Selected entry</div>
          <div className="rounded border border-gray-700 bg-gray-800/80 p-3 text-left">
            {snippet || 'Clipboard text will appear here.'}
          </div>
        </div>
      );

      const result = requestPermission({
        permission: 'clipboard-write',
        title: 'Allow Clipboard Manager to write to your clipboard?',
        summary: 'We need clipboard write access to copy saved snippets back into your clipboard when you pick them.',
        reasons: writeReasons,
        preview,
        confirmLabel: 'Copy to clipboard',
        declineLabel: 'Cancel',
        onAllow: () => performClipboardWrite(text),
      });

      if (result.status === 'blocked') {
        console.info('Clipboard write permission prompt snoozed.');
      }
    },
    [performClipboardWrite, requestPermission, writeReasons],
  );

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
        {items.map((item) => (
          <li
            key={item.id}
            className="cursor-pointer hover:underline"
            onClick={() => handleWrite(item.text)}
          >
            {item.text}
          </li>
        ))}
      </ul>
      {prompt && (
        <PermissionPrompt
          open
          permissionType={prompt.permission}
          title={prompt.title}
          summary={prompt.summary}
          reasons={prompt.reasons}
          preview={prompt.preview}
          confirmLabel={prompt.confirmLabel}
          declineLabel={prompt.declineLabel}
          onDecision={resolvePermission}
        />
      )}
    </div>
  );
};

export const displayClipboardManager = () => <ClipboardManager />;

export default ClipboardManager;

