'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useTrashState, { TrashItem } from '../../../apps/trash/state';
import useOPFS from '../../../hooks/useOPFS';
import {
  discardDuplicateTrashPayload,
  isDuplicateTrashPayload,
  restoreDuplicateFromTrash,
} from '../../../utils/files/duplicateScanner';

const formatAge = (closedAt: number): string => {
  const diff = Date.now() - closedAt;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'Just now';
};

const DEFAULT_ICON = '/themes/Yaru/status/user-trash-symbolic.svg';

const notifyTrashChange = () => window.dispatchEvent(new Event('trash-change'));

async function restoreTrashItem(
  item: TrashItem,
  openApp: (id: string) => void,
  root: FileSystemDirectoryHandle | null,
): Promise<boolean> {
  if (isDuplicateTrashPayload(item.payload)) {
    if (!root) {
      alert('Unable to access storage to restore this file.');
      return false;
    }
    const restored = await restoreDuplicateFromTrash(item.payload, root);
    if (!restored) {
      alert('Unable to restore file from backup. It may have been removed.');
      return false;
    }
    return true;
  }

  openApp(item.id);
  return true;
}

async function discardTrashPayload(
  item: TrashItem,
  root: FileSystemDirectoryHandle | null,
): Promise<void> {
  if (isDuplicateTrashPayload(item.payload) && root) {
    await discardDuplicateTrashPayload(item.payload, root);
  }
}

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const { items, setItems, pushHistory } = useTrashState();
  const { root } = useOPFS();
  const [selected, setSelected] = useState<number | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.closedAt - a.closedAt),
    [items],
  );

  const selectedItem = selected !== null ? sortedItems[selected] : undefined;

  const restore = useCallback(async () => {
    if (selected === null) return;
    const item = sortedItems[selected];
    if (!item) return;
    if (!window.confirm(`Restore ${item.title}?`)) return;
    const didRestore = await restoreTrashItem(item, openApp, root);
    if (!didRestore) return;
    setItems(prev => prev.filter(existing => existing.closedAt !== item.closedAt));
    setSelected(null);
    notifyTrashChange();
  }, [selected, sortedItems, openApp, root, setItems]);

  const remove = useCallback(async () => {
    if (selected === null) return;
    const item = sortedItems[selected];
    if (!item) return;
    if (!window.confirm(`Delete ${item.title}?`)) return;
    await discardTrashPayload(item, root);
    setItems(prev => prev.filter(existing => existing.closedAt !== item.closedAt));
    pushHistory(item);
    setSelected(null);
    notifyTrashChange();
  }, [selected, sortedItems, root, setItems, pushHistory]);

  const restoreAll = useCallback(async () => {
    if (!sortedItems.length) return;
    if (!window.confirm('Restore all items?')) return;
    for (const item of sortedItems) {
      const restored = await restoreTrashItem(item, openApp, root);
      if (!restored) {
        // stop if one fails to avoid partial ambiguity
        return;
      }
    }
    setItems([]);
    setSelected(null);
    notifyTrashChange();
  }, [sortedItems, openApp, root, setItems]);

  const empty = useCallback(async () => {
    if (!sortedItems.length) return;
    if (!window.confirm('Empty trash? This will permanently delete items.')) return;
    for (const item of sortedItems) {
      await discardTrashPayload(item, root);
      pushHistory(item);
    }
    setItems([]);
    setSelected(null);
    notifyTrashChange();
  }, [sortedItems, root, setItems, pushHistory]);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (selected === null) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        remove();
      } else if (event.key === 'Enter' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        restore();
      }
    },
    [selected, remove, restore],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (selected !== null && selected >= sortedItems.length) {
      setSelected(sortedItems.length ? 0 : null);
    }
  }, [sortedItems, selected]);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex">
          <button
            onClick={restore}
            disabled={selectedItem == null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore
          </button>
          <button
            onClick={restoreAll}
            disabled={sortedItems.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore All
          </button>
          <button
            onClick={remove}
            disabled={selectedItem == null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={empty}
            disabled={sortedItems.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Empty
          </button>
        </div>
      </div>
      <div className="flex flex-wrap content-start p-2 overflow-auto">
        {sortedItems.length === 0 && (
          <div className="w-full text-center mt-10">Trash is empty</div>
        )}
        {sortedItems.map((item, idx) => {
          const isSelected = idx === selected;
          const previewIcon = item.image || item.icon || DEFAULT_ICON;
          return (
            <div
              key={item.closedAt}
              tabIndex={0}
              onClick={() => setSelected(idx)}
              className={`m-2 border p-1 w-32 cursor-pointer ${isSelected ? 'bg-ub-drk-abrgn' : ''}`}
            >
              {previewIcon ? (
                <img src={previewIcon} alt={item.title} className="h-20 w-20 mx-auto object-contain" />
              ) : null}
              <p className="text-center text-xs truncate mt-1" title={item.title}>
                {item.title}
              </p>
              <p
                className="text-center text-[10px] text-gray-400"
                aria-label={`Closed ${formatAge(item.closedAt)}`}
              >
                {formatAge(item.closedAt)}
              </p>
              {isDuplicateTrashPayload(item.payload) && (
                <p className="text-center text-[10px] text-ubt-blue mt-1" title={item.payload.relativePath}>
                  From {item.payload.relativePath}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
