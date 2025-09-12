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
  const [orientation, setOrientation] = usePersistentState<'bottom' | 'left'>(
    'dock-orientation',
    'bottom',
    (v): v is 'bottom' | 'left' => v === 'bottom' || v === 'left',
  );

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
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input
          aria-label="Sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          aria-label="Network"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Dock position</span>
        <button
          className="px-2 py-0.5 border rounded"
          onClick={() => setOrientation(orientation === 'bottom' ? 'left' : 'bottom')}
        >
          {orientation === 'bottom' ? 'Bottom' : 'Left'}
        </button>
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
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
