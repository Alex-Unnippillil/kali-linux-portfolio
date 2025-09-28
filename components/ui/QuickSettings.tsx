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
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute right-3 top-9 z-50 w-56 rounded-md py-4 shadow-lg surface-popover ${
        open ? '' : 'hidden'
      }`}
      role="dialog"
      aria-label="Quick settings"
    >
      <div className="px-4 pb-2">
        <button
          className="flex w-full items-center justify-between rounded px-2 py-1 text-sm transition-colors duration-[var(--motion-fast)] hover:bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] focus-visible:bg-[color:color-mix(in_srgb,var(--color-text)_18%,transparent)]"
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
