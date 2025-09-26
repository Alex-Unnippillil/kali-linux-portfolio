"use client";

import { useCallback, useEffect, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useFocusTrap from '../../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose?: () => void;
}

const QuickSettings = ({ open, onClose }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  useFocusTrap(open, containerRef, {
    initialFocusRef: firstButtonRef,
    onEscape: handleClose,
  });

  if (!open) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-settings-title"
      className="absolute right-0 top-9 w-64 rounded-md border border-black border-opacity-20 bg-ub-cool-grey py-4 shadow"
      tabIndex={-1}
    >
      <div className="flex items-start justify-between px-4 pb-2">
        <h2 id="quick-settings-title" className="text-sm font-semibold text-white">
          Quick settings
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded bg-black bg-opacity-30 px-2 py-1 text-xs text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Close quick settings"
        >
          Close
        </button>
      </div>
      <div className="px-4 pb-2">
        <button
          ref={firstButtonRef}
          type="button"
          className="flex w-full items-center justify-between rounded px-2 py-2 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-pressed={theme === 'dark'}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="flex items-center justify-between px-4 pb-2">
        <label className="flex w-full items-center justify-between gap-4 text-sm text-white" htmlFor="quick-settings-sound">
          <span>Sound</span>
          <input
            id="quick-settings-sound"
            type="checkbox"
            checked={sound}
            onChange={() => setSound(!sound)}
          />
        </label>
      </div>
      <div className="flex items-center justify-between px-4 pb-2">
        <label className="flex w-full items-center justify-between gap-4 text-sm text-white" htmlFor="quick-settings-network">
          <span>Network</span>
          <input
            id="quick-settings-network"
            type="checkbox"
            checked={online}
            onChange={() => setOnline(!online)}
          />
        </label>
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <label className="flex w-full items-center justify-between gap-4 text-sm text-white" htmlFor="quick-settings-reduce-motion">
          <span>Reduced motion</span>
          <input
            id="quick-settings-reduce-motion"
            type="checkbox"
            checked={reduceMotion}
            onChange={() => setReduceMotion(!reduceMotion)}
          />
        </label>
      </div>
      <div className="border-t border-black border-opacity-20 px-4 pt-3">
        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded bg-black bg-opacity-30 px-3 py-2 text-sm text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Close menu
        </button>
      </div>
    </div>
  );
};

export default QuickSettings;
