'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import {
  SHORTCUT_OVERLAY_EVENT,
  type ShortcutOverlayEventDetail,
} from './shortcutOverlayEvents';

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const holdOpenRef = useRef(false);

  const openOverlay = useCallback(() => {
    setOpen(true);
  }, []);

  const closeOverlay = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ShortcutOverlayEventDetail>).detail;
      if (!detail) return;
      if (detail.action === 'hold') {
        if (detail.state === 'start') {
          holdOpenRef.current = true;
          openOverlay();
        } else if (detail.state === 'end') {
          holdOpenRef.current = false;
          closeOverlay();
        }
      } else if (detail.action === 'close') {
        holdOpenRef.current = false;
        closeOverlay();
      } else if (detail.action === 'open') {
        openOverlay();
      }
    };
    window.addEventListener(SHORTCUT_OVERLAY_EVENT, listener as EventListener);
    return () =>
      window.removeEventListener(
        SHORTCUT_OVERLAY_EVENT,
        listener as EventListener,
      );
  }, [closeOverlay, openOverlay]);

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        holdOpenRef.current = false;
        closeOverlay();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, closeOverlay]);

  useEffect(() => {
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        lastFocusedRef.current = active;
      } else {
        lastFocusedRef.current = null;
      }

      const focusOverlay = () => {
        containerRef.current?.focus({ preventScroll: true });
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(focusOverlay);
      } else {
        setTimeout(focusOverlay, 0);
      }
    } else if (wasOpenRef.current) {
      const previous = lastFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
      lastFocusedRef.current = null;
    }
    wasOpenRef.current = open;
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

  const keyCounts = shortcuts.reduce<Map<string, number>>((map, s) => {
    map.set(s.keys, (map.get(s.keys) || 0) + 1);
    return map;
  }, new Map());
  const conflicts = new Set(
    Array.from(keyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );

  const hidden = !open;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-hidden={hidden}
      hidden={hidden}
      tabIndex={-1}
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => {
              holdOpenRef.current = false;
              closeOverlay();
            }}
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
