"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute rounded-md py-4 top-9 right-3 shadow border bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] ${
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
      <div className="px-4 pb-2 flex justify-between">
        <label htmlFor="qs-sound">Sound</label>
        <input
          id="qs-sound"
          aria-label="Sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <label htmlFor="qs-network">Network</label>
        <input
          id="qs-network"
          aria-label="Network"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </div>
      <div className="px-4 flex justify-between">
        <label htmlFor="qs-reduced-motion">Reduced motion</label>
        <input
          id="qs-reduced-motion"
          aria-label="Reduced motion"
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
