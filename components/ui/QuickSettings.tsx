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
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-center"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('open-app', { detail: 'screenshooter' })
            )
          }
        >
          Screenshot
        </button>
      </div>
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between items-center">
        <label htmlFor="qs-sound">Sound</label>
        <input
          id="qs-sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Sound"
        />
      </div>
      <div className="px-4 pb-2 flex justify-between items-center">
        <label htmlFor="qs-network">Network</label>
        <input
          id="qs-network"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Network"
        />
      </div>
      <div className="px-4 flex justify-between items-center">
        <label htmlFor="qs-motion">Reduced motion</label>
        <input
          id="qs-motion"
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Reduced motion"
        />
      </div>
    </div>
  );
};

export default QuickSettings;
