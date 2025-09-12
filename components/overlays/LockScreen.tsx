'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

const LockScreen: React.FC = () => {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const { shortcuts } = useKeymap();

  const lockKeys =
    shortcuts.find((s) => s.description === 'Lock screen')?.keys || 'Ctrl+L';

  const close = useCallback(() => {
    setOpen(false);
    prevFocusRef.current?.focus();
    prevFocusRef.current = null;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      const parts = [
        e.ctrlKey ? 'Ctrl' : '',
        e.altKey ? 'Alt' : '',
        e.shiftKey ? 'Shift' : '',
        e.metaKey ? 'Meta' : '',
        e.key.length === 1 ? e.key.toUpperCase() : e.key,
      ].filter(Boolean);
      const combo = parts.join('+');
      if (combo === lockKeys) {
        e.preventDefault();
        if (!open) {
          prevFocusRef.current = document.activeElement as HTMLElement;
          setOpen(true);
          setTimeout(() => overlayRef.current?.focus(), 0);
        } else {
          close();
        }
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lockKeys, open, close]);

  useEffect(() => {
    if (!open) return;
    const handleFocus = (e: FocusEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        e.preventDefault();
        overlayRef.current.focus();
      }
    };
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <p className="text-2xl text-white">Locked – Press Esc to unlock</p>
    </div>
  );
};

export default LockScreen;

