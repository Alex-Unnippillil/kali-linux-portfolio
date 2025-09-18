'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import TitleBar from '../../base/TitleBar';

interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
}

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

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const actionButtonStyle = useMemo(
    () => ({
      background: 'color-mix(in srgb, var(--color-surface), transparent 45%)',
      borderColor: 'color-mix(in srgb, var(--color-border), transparent 20%)',
    }),
    [],
  );

  const actionButtonClass =
    'rounded border px-3 py-1 text-xs font-medium transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:opacity-50';

  useEffect(() => {
    const purgeDays = parseInt(localStorage.getItem('trash-purge-days') || '30', 10);
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let data: TrashItem[] = [];
    try {
      data = JSON.parse(localStorage.getItem('window-trash') || '[]');
    } catch {
      data = [];
    }
    data = data.filter((item) => now - item.closedAt <= ms);
    localStorage.setItem('window-trash', JSON.stringify(data));
    setItems(data);
  }, []);

  const persist = (next: TrashItem[]) => {
    setItems(next);
    localStorage.setItem('window-trash', JSON.stringify(next));
  };

  const restore = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.title}?`)) return;
    openApp(item.id);
    const next = items.filter((_, i) => i !== selected);
    persist(next);
    setSelected(null);
  }, [items, selected, openApp]);

  const remove = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const next = items.filter((_, i) => i !== selected);
    persist(next);
    setSelected(null);
  }, [items, selected]);

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    items.forEach((item) => openApp(item.id));
    persist([]);
    setSelected(null);
  };

  const empty = () => {
    if (items.length === 0) return;
    if (!window.confirm('Empty trash?')) return;
    persist([]);
    setSelected(null);
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (selected === null) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove();
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        restore();
      }
    },
    [selected, remove, restore]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <TitleBar
        headingLevel={1}
        icon={
          <Image
            src="/themes/Yaru/status/user-trash-symbolic.svg"
            alt="Trash icon"
            width={28}
            height={28}
            sizes="28px"
            priority
          />
        }
        title="Trash"
        actions={
          <>
            <button
              type="button"
              onClick={restore}
              disabled={selected === null}
              className={actionButtonClass}
              style={actionButtonStyle}
            >
              Restore
            </button>
            <button
              type="button"
              onClick={restoreAll}
              disabled={items.length === 0}
              className={actionButtonClass}
              style={actionButtonStyle}
            >
              Restore All
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={selected === null}
              className={actionButtonClass}
              style={actionButtonStyle}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={empty}
              disabled={items.length === 0}
              className={actionButtonClass}
              style={actionButtonStyle}
            >
              Empty
            </button>
          </>
        }
      />
      <div className="flex flex-wrap content-start p-2 overflow-auto">
        {items.length === 0 && <div className="w-full text-center mt-10">Trash is empty</div>}
        {items.map((item, idx) => (
          <div
            key={item.closedAt}
            tabIndex={0}
            onClick={() => setSelected(idx)}
            className={`m-2 border p-1 w-32 cursor-pointer ${selected === idx ? 'bg-ub-drk-abrgn' : ''}`}
          >
            {item.image ? (
              <img src={item.image} alt={item.title} className="h-20 w-full object-cover" />
            ) : item.icon ? (
              <img src={item.icon} alt={item.title} className="h-20 w-20 mx-auto object-contain" />
            ) : null}
            <p className="text-center text-xs truncate mt-1" title={item.title}>
              {item.title}
            </p>
            <p className="text-center text-[10px] text-gray-400" aria-label={`Closed ${formatAge(item.closedAt)}`}>
              {formatAge(item.closedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

