'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useKeymap from '../settings/keymapRegistry';

const Terminal = dynamic(() => import('./index'), { ssr: false });

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

const Quake: React.FC = () => {
  const { shortcuts } = useKeymap();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 400;
    const saved = window.sessionStorage.getItem('quake-height');
    return saved ? parseInt(saved, 10) : 400;
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;
      const key =
        shortcuts.find((s) => s.description === 'Toggle Quake terminal')?.keys ||
        '`';
      if (formatEvent(e) === key) {
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
    if (!open) return;
    const el = wrapperRef.current?.querySelector(
      '[data-testid="xterm-container"]',
    ) as HTMLElement | null;
    if (!el) return;
    el.style.height = `${height}px`;
    const observer = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height);
      setHeight(h);
      try {
        window.sessionStorage.setItem('quake-height', String(h));
      } catch {}
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, height]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transform transition-transform duration-300 ${open ? 'translate-y-0' : '-translate-y-full pointer-events-none'}`}
    >
      <div ref={wrapperRef} className="mx-auto shadow-lg">
        {open && <Terminal />}
      </div>
    </div>
  );
};

export default Quake;

