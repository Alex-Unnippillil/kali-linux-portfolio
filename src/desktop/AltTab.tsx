'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WindowCollection =
  | AltTabWindowLike[]
  | Map<string, AltTabWindowLike>
  | Record<string, AltTabWindowLike>
  | Iterable<AltTabWindowLike | [unknown, AltTabWindowLike]>
  | null
  | undefined;

export interface AltTabWindowLike {
  id?: string;
  title?: string;
  name?: string;
  label?: string;
  z?: number | string;
  zIndex?: number | string;
  order?: number | string;
  minimized?: boolean;
  hidden?: boolean;
  visible?: boolean;
  state?: string;
  meta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  details?: Record<string, unknown>;
  info?: Record<string, unknown>;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WindowManager {
  focus(id: string): void | Promise<void>;
  getWindows?: () => WindowCollection;
  windows?: WindowCollection;
}

export interface AltTabProps {
  wm: WindowManager;
  className?: string;
  itemClassName?: string;
}

export interface AltTabEntry {
  id: string;
  title: string;
  z: number;
}

type InternalEntry = AltTabEntry & { index: number };

const OVERLAY_CLASS =
  'fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 text-white';
const LIST_CLASS =
  'flex min-w-[16rem] max-w-[32rem] flex-col gap-2 rounded-xl bg-neutral-900/90 px-5 py-4 shadow-xl backdrop-blur';
const ITEM_CLASS = 'rounded-md bg-white/10 px-3 py-2 text-sm font-medium';

const AltTab: React.FC<AltTabProps> = ({ wm, className = '', itemClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<InternalEntry[]>([]);
  const openRef = useRef(isOpen);
  const entriesRef = useRef<InternalEntry[]>(entries);

  const closeOverlay = useCallback(() => {
    entriesRef.current = [];
    openRef.current = false;
    setEntries([]);
    setIsOpen(false);
  }, []);

  const openOverlay = useCallback(() => {
    const sorted = getInternalEntries(wm);
    if (!sorted.length) {
      closeOverlay();
      return;
    }
    entriesRef.current = sorted;
    openRef.current = true;
    setEntries(sorted);
    setIsOpen(true);
  }, [closeOverlay, wm]);

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && event.altKey) {
        event.preventDefault();
        openOverlay();
        return;
      }

      if (!openRef.current) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const first = entriesRef.current[0];
        if (first) {
          try {
            const result = wm.focus(first.id);
            if (result && typeof (result as Promise<unknown>).then === 'function') {
              void (result as Promise<unknown>).catch(() => {});
            }
          } catch {
            // ignore focus errors
          }
        }
        closeOverlay();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!openRef.current) return;
      if (event.key === 'Alt') {
        closeOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [closeOverlay, openOverlay, wm]);

  if (!isOpen || entries.length === 0) {
    return null;
  }

  return (
    <div className={`${OVERLAY_CLASS} ${className}`} role="presentation">
      <div className={LIST_CLASS} role="list">
        {entries.map((entry) => (
          <div
            key={entry.id}
            role="listitem"
            className={`${ITEM_CLASS} ${itemClassName}`}
          >
            {entry.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AltTab;

export function getAltTabEntries(wm: WindowManager): AltTabEntry[] {
  return getInternalEntries(wm).map(({ index, ...entry }) => entry);
}

function getInternalEntries(wm: WindowManager): InternalEntry[] {
  let source: WindowCollection;
  try {
    source = typeof wm.getWindows === 'function' ? wm.getWindows() : wm.windows;
  } catch {
    source = wm.windows;
  }

  const rawWindows = collectWindows(source);
  const seen = new Set<string>();

  const normalized = rawWindows
    .map((win, index) => normalizeWindow(win, index))
    .filter((entry): entry is InternalEntry => {
      if (!entry) return false;
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });

  normalized.sort((a, b) => {
    if (b.z !== a.z) return b.z - a.z;
    return a.index - b.index;
  });

  return normalized;
}

function collectWindows(source: WindowCollection): AltTabWindowLike[] {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (source instanceof Map) return Array.from(source.values());

  if (isPlainObject(source)) {
    return Object.values(source as Record<string, AltTabWindowLike>);
  }

  if (isIterable(source)) {
    const result: AltTabWindowLike[] = [];
    for (const item of source as Iterable<unknown>) {
      if (!item) continue;
      if (Array.isArray(item)) {
        const value = item[item.length - 1];
        if (value && typeof value === 'object') {
          result.push(value as AltTabWindowLike);
        }
        continue;
      }
      if (typeof item === 'object') {
        result.push(item as AltTabWindowLike);
      }
    }
    if (result.length) {
      return result;
    }
  }

  return [];
}

function normalizeWindow(win: AltTabWindowLike, index: number): InternalEntry | null {
  const id = getWindowId(win);
  if (!id) return null;

  const title = getWindowTitle(win, id);
  const z = getWindowZ(win, index);

  return { id, title, z, index };
}

function getWindowId(win: AltTabWindowLike): string | null {
  const idKeys = ['id', 'windowId', 'key', 'slug'];
  for (const candidate of getCandidateObjects(win)) {
    for (const key of idKeys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }
  return null;
}

function getWindowTitle(win: AltTabWindowLike, fallback: string): string {
  const titleKeys = ['title', 'name', 'label'];
  for (const candidate of getCandidateObjects(win)) {
    for (const key of titleKeys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }
  return fallback;
}

function getWindowZ(win: AltTabWindowLike, fallback: number): number {
  const zKeys = ['z', 'zIndex', 'order', 'stack', 'index'];
  for (const candidate of getCandidateObjects(win)) {
    for (const key of zKeys) {
      const value = candidate[key];
      const parsed = toNumber(value);
      if (parsed !== null) {
        return parsed;
      }
    }
  }
  return fallback;
}

function getCandidateObjects(win: AltTabWindowLike): Record<string, any>[] {
  const candidates: Record<string, any>[] = [];
  const push = (value: unknown) => {
    if (value && typeof value === 'object') {
      candidates.push(value as Record<string, any>);
    }
  };

  push(win);
  const nestedKeys = ['meta', 'metadata', 'details', 'info', 'data', 'window', 'config'];
  for (const key of nestedKeys) {
    if (key in win) {
      push(win[key]);
    }
  }

  return candidates;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isIterable(value: unknown): value is Iterable<unknown> {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as any)[Symbol.iterator] === 'function';
}
