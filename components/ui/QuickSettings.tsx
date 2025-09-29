"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import clsx from 'clsx';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const soundId = 'quick-settings-sound';
  const networkId = 'quick-settings-network';
  const motionId = 'quick-settings-motion';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const rowClass =
    'flex items-center justify-between px-4 py-2 text-sm text-white/90 transition-colors';

  return (
    <div
      className={clsx(
        'absolute top-9 right-3 z-40 w-64 rounded-lg border border-interactive-border bg-interactive-surface shadow-interactive backdrop-blur-sm transition-all duration-150',
        open ? 'block' : 'hidden',
      )}
      role="dialog"
      aria-label="Quick settings"
    >
      <div className="space-y-1 py-2">
        <button
          className={`${rowClass} w-full rounded-md text-left hover:bg-interactive-hover focus-visible:bg-interactive-hover active:bg-interactive-active`}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
        <label htmlFor={soundId} className={`${rowClass} cursor-pointer`}>
          <span className="font-medium text-white">Sound</span>
          <input
            id={soundId}
            type="checkbox"
            checked={sound}
            aria-label="Toggle sound"
            onChange={() => setSound(!sound)}
          />
        </label>
        <label htmlFor={networkId} className={`${rowClass} cursor-pointer`}>
          <span className="font-medium text-white">Network</span>
          <input
            id={networkId}
            type="checkbox"
            checked={online}
            aria-label="Toggle network"
            onChange={() => setOnline(!online)}
          />
        </label>
        <label htmlFor={motionId} className={`${rowClass} cursor-pointer`}>
          <span className="font-medium text-white">Reduced motion</span>
          <input
            id={motionId}
            type="checkbox"
            checked={reduceMotion}
            aria-label="Toggle reduced motion"
            onChange={() => setReduceMotion(!reduceMotion)}
          />
        </label>
      </div>
    </div>
  );
};

export default QuickSettings;
