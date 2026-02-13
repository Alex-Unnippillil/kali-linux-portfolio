'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

// Static files that can be opened directly in a new tab
const files = ['README.md', 'CHANGELOG.md', 'package.json'];

export default function VsCodeWrapper({ openApp }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [liveMessage, setLiveMessage] = useState('');
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const itemRefs = useRef([]);
  const isFirstRender = useRef(true);

  const items = useMemo(() => {
    const list = [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length, visible]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (visible) {
          setVisible(false);
        } else {
          lastFocusedElementRef.current = document.activeElement;
          setVisible(true);
        }
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  const selectItem = (item) => {
    setVisible(false);
    if (item.type === 'app' && openApp) {
      openApp(item.id);
    } else if (item.type === 'file') {
      window.open(item.id, '_blank');
    }
  };

  const handleOverlayKeyDown = (event) => {
    if (!visible) return;

    const getFocusableElements = () => {
      if (!overlayRef.current) return [];
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      return Array.from(
        overlayRef.current.querySelectorAll(selectors.join(','))
      ).filter((el) => !el.hasAttribute('disabled'));
    };

    if (event.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
          if (last === inputRef.current) {
            setActiveIndex(-1);
          } else {
            const idx = itemRefs.current.findIndex((el) => el === last);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
        if (first === inputRef.current) {
          setActiveIndex(-1);
        } else {
          const idx = itemRefs.current.findIndex((el) => el === first);
          if (idx !== -1) setActiveIndex(idx);
        }
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      setActiveIndex((prev) => {
        if (prev === items.length - 1) {
          return -1;
        }
        return prev + 1;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      setActiveIndex((prev) => {
        if (prev === -1) {
          return items.length - 1;
        }
        if (prev === 0) {
          return -1;
        }
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && document.activeElement === inputRef.current) {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      const index = activeIndex >= 0 ? activeIndex : 0;
      const item = items[index];
      if (item) {
        selectItem(item);
      }
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (items.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev === -1) {
        return -1;
      }
      const next = Math.min(prev, items.length - 1);
      return next;
    });
  }, [items, visible]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (visible) {
      setActiveIndex(-1);
      setLiveMessage('Command palette opened');
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setQuery('');
      setActiveIndex(-1);
      setLiveMessage('Command palette closed');
      const previousFocus = lastFocusedElementRef.current;
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
      lastFocusedElementRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (activeIndex === -1) {
      inputRef.current?.focus();
      return;
    }
    const node = itemRefs.current[activeIndex];
    node?.focus();
  }, [activeIndex, visible, items]);

  return (
    <div className="relative h-full w-full">
      <VsCode />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>
      {visible && (
        <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/50">
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="bg-gray-800 text-white w-11/12 max-w-md rounded shadow-lg p-2"
            onKeyDown={handleOverlayKeyDown}
          >
            <label htmlFor="command-palette-input" className="sr-only">
              Search apps or files
            </label>
            <input
              id="command-palette-input"
              ref={inputRef}
              autoFocus
              type="text"
              className="w-full p-2 mb-2 bg-gray-700 rounded outline-none"
              placeholder="Search apps or files"
              aria-label="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item, index) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    onClick={() => selectItem(item)}
                    className={`w-full text-left px-2 py-1 rounded focus:outline-none ${
                      index === activeIndex
                        ? 'bg-gray-700'
                        : 'hover:bg-gray-700 focus:bg-gray-700'
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;

