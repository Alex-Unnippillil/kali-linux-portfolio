'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  KeyboardEventHandler,
  ReactNode,
} from 'react';

export interface SwitcherWindow {
  id: string;
  title: string;
  icon?: string | ReactNode;
  description?: string;
  accentColor?: string;
  [key: string]: unknown;
}

export interface SwitcherProps {
  windows?: SwitcherWindow[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
}

const baseHighlightStyle: CSSProperties = {
  transform: 'translate3d(0, 0, 0)',
  height: 0,
  opacity: 0,
};

export default function Switcher({
  windows = [],
  onSelect,
  onClose,
}: SwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingSelection = useRef<number | null>(null);

  const deferredQuery = useDeferredValue(query);

  const candidates = useMemo(
    () =>
      windows
        .filter((item): item is SwitcherWindow => Boolean(item && item.id && item.title))
        .map((item) => ({ ...item })),
    [windows],
  );

  const normalizedQuery = useMemo(
    () => deferredQuery.trim().toLowerCase(),
    [deferredQuery],
  );

  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return candidates;
    }
    return candidates.filter((item) =>
      item.title.toLowerCase().includes(normalizedQuery),
    );
  }, [candidates, normalizedQuery]);

  const commitSelection = useCallback(
    (index: number) => {
      const target = filtered[index];
      if (!target) {
        onClose?.();
        return;
      }
      onSelect?.(target.id);
    },
    [filtered, onClose, onSelect],
  );

  const queueSelection = useCallback((next: number) => {
    pendingSelection.current = next;
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      if (pendingSelection.current !== null) {
        setSelectedIndex(pendingSelection.current);
      }
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    queueSelection(0);
  }, [normalizedQuery, queueSelection]);

  useEffect(() => {
    if (filtered.length === 0) {
      queueSelection(0);
    } else if (selectedIndex >= filtered.length) {
      queueSelection(Math.max(filtered.length - 1, 0));
    }
  }, [filtered, queueSelection, selectedIndex]);

  const updateHighlight = useCallback(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;
    if (!list || !highlight) return;

    const active = list.children[selectedIndex] as HTMLElement | undefined;
    if (!active) {
      highlight.style.opacity = '0';
      return;
    }

    const { offsetHeight, offsetTop } = active;
    highlight.style.opacity = filtered.length ? '1' : '0';
    highlight.style.height = `${offsetHeight}px`;
    highlight.style.transform = `translate3d(0, ${offsetTop}px, 0)`;
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateHighlight);
    return () => cancelAnimationFrame(frame);
  }, [filtered, selectedIndex, updateHighlight]);

  useEffect(() => {
    if (!listRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateHighlight);
    });
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [filtered.length, updateHighlight]);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        commitSelection(selectedIndex);
      }
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, [commitSelection, selectedIndex]);

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (event) => {
      if (!filtered.length) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const next = event.shiftKey
          ? (selectedIndex - 1 + filtered.length) % filtered.length
          : (selectedIndex + 1) % filtered.length;
        queueSelection(next);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        queueSelection((selectedIndex + 1) % filtered.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        queueSelection((selectedIndex - 1 + filtered.length) % filtered.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        commitSelection(selectedIndex);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    },
    [filtered.length, queueSelection, selectedIndex, commitSelection, onClose],
  );

  const handleMouseEnter = useCallback(
    (index: number) => () => queueSelection(index),
    [queueSelection],
  );

  const handleClick = useCallback(
    (index: number) => () => commitSelection(index),
    [commitSelection],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
      <div className="w-[min(90vw,640px)] rounded-xl bg-ub-grey/95 p-5 shadow-2xl shadow-black/40">
        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          Switch windows
        </label>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search windows"
          autoComplete="off"
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-ub-orange focus:bg-black/40"
        />
        <div className="relative mt-4 max-h-80 overflow-y-auto">
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 z-0 rounded-md bg-ub-orange/90 will-change-transform motion-safe:transition-[transform,height,opacity] motion-safe:duration-150 motion-safe:ease-out"
            style={baseHighlightStyle}
          />
          <ul
            ref={listRef}
            role="listbox"
            aria-activedescendant={filtered[selectedIndex]?.id ?? undefined}
            className="relative z-10 flex flex-col gap-1"
          >
            {filtered.length ? (
              filtered.map((item, index) => {
                const isActive = index === selectedIndex;
                const textColor = isActive ? 'text-black' : 'text-white/80';
                const icon = item.icon;

                return (
                  <li key={item.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseEnter={handleMouseEnter(index)}
                      onFocus={handleMouseEnter(index)}
                      onClick={handleClick(index)}
                      className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ${textColor}`}
                    >
                      {icon ? (
                        typeof icon === 'string' ? (
                          <img
                            src={icon}
                            alt=""
                            className="h-7 w-7 flex-shrink-0 rounded-md bg-black/20 object-contain p-1"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black/20">
                            {icon}
                          </span>
                        )
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-black/10 text-xs font-semibold text-white/60">
                          {index + 1}
                        </span>
                      )}
                      <span className="flex flex-col">
                        <span className="font-medium leading-tight">{item.title}</span>
                        {item.description ? (
                          <span className="text-xs text-white/60">{item.description}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="rounded-md bg-black/30 px-3 py-4 text-sm text-white/60">
                No matching windows
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
