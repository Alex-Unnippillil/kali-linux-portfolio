'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useKeymap from '../keymapRegistry';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

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

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  const { shortcuts, updateShortcut } = useKeymap();
  const [rebinding, setRebinding] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const headingId = 'settings-keymap-overlay-title';

  const closeOverlay = useCallback(() => {
    setRebinding(null);
    onClose();
  }, [onClose, setRebinding]);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      updateShortcut(rebinding, combo);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut]);

  useEffect(() => {
    if (!open) {
      setRebinding(null);
      if (triggerRef.current) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
      return;
    }

    const node = overlayRef.current;
    if (!node) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const elements = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (elements.length > 0) {
        elements[0].focus();
      } else {
        node.focus();
      }
    };

    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
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
  }, [open, closeOverlay]);

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
            onClick={closeOverlay}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <ul className="space-y-1">
          {shortcuts.map((s) => (
            <li
              key={s.description}
              data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
              className={
                conflicts.has(s.keys)
                  ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                  : 'flex justify-between px-2 py-1'
              }
            >
              <span className="flex-1">{s.description}</span>
              <span className="font-mono mr-2">{s.keys}</span>
              <button
                type="button"
                onClick={() => setRebinding(s.description)}
                className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
              >
                {rebinding === s.description ? 'Press keys...' : 'Rebind'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
