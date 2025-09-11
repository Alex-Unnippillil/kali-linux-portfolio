"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState<'light' | 'dark' | 'work'>(
    'qs-theme',
    'light',
    (v): v is 'light' | 'dark' | 'work' =>
      typeof v === 'string' && ['light', 'dark', 'work'].includes(v),
  );
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const dataTheme =
      theme === 'work' ? 'undercover' : theme === 'light' ? 'default' : theme;
    document.documentElement.dataset.theme = dataTheme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() =>
            setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'work' : 'light')
          }
        >
          <span>Theme</span>
          <span>
            {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Work'}
          </span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input
          type="checkbox"
          aria-label="Toggle sound"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          aria-label="Toggle network"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          aria-label="Toggle reduced motion"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
