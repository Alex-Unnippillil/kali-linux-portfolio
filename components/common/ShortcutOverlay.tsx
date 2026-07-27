'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key.toUpperCase() : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]'
].join(',');

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      const show =
        shortcuts.find((s) => s.description === 'Show keyboard shortcuts')?.keys ||
        '?';
      if (formatEvent(e) === show) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, shortcuts, close]);

  useEffect(() => {
    if (!open) return undefined;
    const overlay = overlayRef.current;
    if (!overlay) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusable = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    const focusTarget = focusable[0] ?? overlay;
    focusTarget.focus();

    const enforceFocus = (event: FocusEvent) => {
      if (!overlay.contains(event.target as Node)) {
        const updatedFocusable = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        const target = updatedFocusable[0] ?? overlay;
        target.focus();
      }
    };

    document.addEventListener('focus', enforceFocus, true);

    return () => {
      document.removeEventListener('focus', enforceFocus, true);
      const previouslyFocused = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      previouslyFocused?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab') return;

      const overlay = overlayRef.current;
      if (!overlay) return;

      const focusable = overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusable.length === 0) {
        event.preventDefault();
        overlay.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first || !overlay.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !overlay.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    },
    [close]
  );

  const handleExport = () => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const keyCounts = shortcuts.reduce<Map<string, number>>((map, s) => {
    map.set(s.keys, (map.get(s.keys) || 0) + 1);
    return map;
  }, new Map());
  const conflicts = new Set(
    Array.from(keyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
      ref={overlayRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={close}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-2 py-1 bg-gray-700 rounded text-sm"
        >
          Export JSON
        </button>
        <ul className="space-y-1">
          {shortcuts.map((s, i) => (
            <li
              key={i}
              data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
              className={
                conflicts.has(s.keys)
                  ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                  : 'flex justify-between px-2 py-1'
              }
            >
              <span className="font-mono mr-4">{s.keys}</span>
              <span className="flex-1">{s.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
