"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    if (open) {
      containerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-labelledby="status-bar"
      tabIndex={-1}
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
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
      <label className="px-4 pb-2 flex justify-between items-center gap-2">
        <span id="quick-settings-sound-label">Sound</span>
        <input
          type="checkbox"
          aria-labelledby="quick-settings-sound-label"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </label>
      <label className="px-4 pb-2 flex justify-between items-center gap-2">
        <span id="quick-settings-network-label">Network</span>
        <input
          type="checkbox"
          aria-labelledby="quick-settings-network-label"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </label>
      <label className="px-4 flex justify-between items-center gap-2">
        <span id="quick-settings-reduced-motion-label">Reduced motion</span>
        <input
          type="checkbox"
          aria-labelledby="quick-settings-reduced-motion-label"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </div>
  );
};

export default QuickSettings;
