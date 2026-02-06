'use client';

import React, { useEffect, useState, useRef } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import { TOUCH_HINTS } from './touchHints';

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

const focusableSelectors =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      const pressed = formatEvent(e);
      const questionMatch = show === '?' && e.key === '?';
      if (pressed === show || questionMatch) {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          previousFocusRef.current =
            target instanceof HTMLElement ? target : document.body;
          setOpen(true);
        }
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, shortcuts]);

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

  useEffect(() => {
    if (!open) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      return;
    }

    const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
      focusableSelectors
    );
    const firstFocusable = closeButtonRef.current || (focusable && focusable[0]);
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      if (!overlayRef.current?.contains(event.target as Node)) return;

      const items = overlayRef.current?.querySelectorAll<HTMLElement>(
        focusableSelectors
      );
      if (!items || items.length === 0) return;

      const focusables = Array.from(items).filter(
        (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleTrap);
    return () => document.removeEventListener('keydown', handleTrap);
  }, [open]);

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
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-overlay-title"
      aria-describedby="shortcut-overlay-description"
    >
      <div className="max-w-xl w-full space-y-4 bg-gray-900/70 backdrop-blur rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h2 id="shortcut-overlay-title" className="text-xl font-bold">
              Keyboard & Touch Shortcuts
            </h2>
            <p id="shortcut-overlay-description" className="text-sm text-gray-200">
              Press Escape to close. Use Tab to move between controls. Touch users can
              tap the same controls to explore the available gestures.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue rounded"
          >
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue"
          >
            Export JSON
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="shortcut-overlay-keyboard">
            <h3 id="shortcut-overlay-keyboard" className="text-lg font-semibold mb-2">
              Keyboard
            </h3>
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
          </section>
          <section aria-labelledby="shortcut-overlay-touch">
            <h3 id="shortcut-overlay-touch" className="text-lg font-semibold mb-2">
              Touch equivalents
            </h3>
            <ul className="space-y-2">
              {TOUCH_HINTS.map(({ gesture, action }) => (
                <li key={gesture} className="rounded border border-gray-700 p-2">
                  <p className="font-semibold">{gesture}</p>
                  <p className="text-sm text-gray-200">{action}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
