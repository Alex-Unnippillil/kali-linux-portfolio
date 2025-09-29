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
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border border-card ${
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
      <label className="px-4 pb-2 flex cursor-pointer items-center justify-between">
        <span>Sound</span>
        <input
          aria-label="Toggle sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </label>
      <label className="px-4 pb-2 flex cursor-pointer items-center justify-between">
        <span>Network</span>
        <input
          aria-label="Toggle network availability"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </label>
      <label className="px-4 flex cursor-pointer items-center justify-between">
        <span>Reduced motion</span>
        <input
          aria-label="Toggle reduced motion"
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </div>
  );
};

export default QuickSettings;
