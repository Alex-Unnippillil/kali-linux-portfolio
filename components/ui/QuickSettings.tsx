"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import Checklist from '../common/Checklist';

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
      <label className="px-4 pb-2 flex items-center justify-between">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle sound"
        />
      </label>
      <label className="px-4 pb-2 flex items-center justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle network"
        />
      </label>
      <label className="px-4 flex items-center justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Toggle reduced motion"
        />
      </label>
      <div className="mt-4 border-t border-white/10 px-4 pt-4">
        <Checklist />
      </div>
    </div>
  );
};

export default QuickSettings;
