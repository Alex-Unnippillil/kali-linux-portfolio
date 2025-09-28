"use client";

import { useEffect, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useFocusTrap from '../../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
}

const focusableSelector =
  'button:not([disabled]), input:not([disabled])';

const QuickSettings = ({ open, onClose }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, open);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const firstFocusable = containerRef.current?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      ref={containerRef}
      data-testid="quick-settings"
      role="dialog"
      aria-modal="true"
      aria-label="Quick settings"
      aria-hidden={!open}
      className={`absolute right-0 top-full mt-2 bg-ub-cool-grey rounded-md py-4 shadow border-black border border-opacity-20 focus:outline-none ${
        open ? 'block' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label className="px-4 pb-2 flex justify-between items-center text-left">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Sound"
        />
      </label>
      <label className="px-4 pb-2 flex justify-between items-center text-left">
        <span>Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Network"
        />
      </label>
      <label className="px-4 flex justify-between items-center text-left">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Reduced motion"
        />
      </label>
    </div>
  );
};

export default QuickSettings;
