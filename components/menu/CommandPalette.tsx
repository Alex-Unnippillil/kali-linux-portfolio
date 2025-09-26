'use client';

import Image from 'next/image';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  getDefaultCommands,
  searchLauncherItems,
  LauncherItem,
} from './launcherSearch';

const MAX_RESULTS = 12;

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim();
    const base = trimmed ? searchLauncherItems(trimmed) : getDefaultCommands();
    const seen = new Set<string>();
    const unique = base.filter((item) => {
      const key = `${item.type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.slice(0, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(query.length, query.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, query, results.length]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
  }, []);

  const triggerCommand = useCallback((item: LauncherItem) => {
    if (item.type === 'app' && item.action.kind === 'open-app') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: item.action.appId }));
    } else if (item.action.kind === 'placeholder') {
      console.info(`[CommandPalette] ${item.action.description}`);
    }
  }, []);

  const handleSelect = useCallback((item: LauncherItem) => {
    triggerCommand(item);
    closePalette();
  }, [triggerCommand, closePalette]);

  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'r' && e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[highlight];
      if (item) handleSelect(item);
    }
  }, [open, results, highlight, handleSelect, closePalette]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  if (!mounted) return null;

  return createPortal(
    open ? (
      <div
        className="fixed inset-0 z-[999] flex items-start justify-center bg-black/60 px-4 pt-24"
        onMouseDown={closePalette}
        role="presentation"
      >
        <div
          className="w-full max-w-xl overflow-hidden rounded-lg bg-ub-grey text-white shadow-xl ring-1 ring-black/40"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-white/10 px-4 py-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Run a command or search apps and settings"
              className="w-full rounded bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-ubb-orange"
              aria-label="Command palette input"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-results"
            />
            <p className="mt-2 text-xs text-ubt-grey">Press Enter to run • Esc to close</p>
          </div>
          <div
            id="command-palette-results"
            ref={listRef}
            className="max-h-80 overflow-y-auto"
            role="listbox"
          >
            {results.length ? (
              results.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={highlight === index}
                  data-index={index}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(item);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition focus:outline-none ${
                    highlight === index ? 'bg-white/10' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon ? (
                      <Image
                        src={item.icon}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded"
                      />
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/40 text-xs uppercase">
                        {item.group.charAt(0)}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-ubt-grey">{item.subtitle}</span>
                    </div>
                  </div>
                  <span className="text-xs text-ubt-grey">{item.group}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-ubt-grey">No commands found.</div>
            )}
          </div>
        </div>
      </div>
    ) : null,
    document.body,
  );
};

export default CommandPalette;

