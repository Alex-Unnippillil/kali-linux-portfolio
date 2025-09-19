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
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingId = 'shortcut-overlay-title';

  const toggle = useCallback(() => setOpen((o) => !o), []);

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
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, shortcuts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = overlayRef.current;
    if (!node) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const focusFirstElement = () => {
      const elements = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (elements.length > 0) {
        elements[0].focus();
      } else {
        node.focus();
      }
    };

    focusFirstElement();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );

      if (elements.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const isOutside = active ? !node.contains(active) : true;

      if (event.shiftKey) {
        if (isOutside || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (isOutside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

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
      aria-labelledby={headingId}
      ref={overlayRef}
      tabIndex={-1}
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 id={headingId} className="text-xl font-bold">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
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
