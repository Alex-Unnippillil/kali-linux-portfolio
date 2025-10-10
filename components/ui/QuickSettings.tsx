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

  const soundToggleId = 'quick-settings-sound-toggle';
  const networkToggleId = 'quick-settings-network-toggle';
  const reduceMotionToggleId = 'quick-settings-reduce-motion-toggle';

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
          aria-pressed={theme === 'dark'}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label className="px-4 pb-2 flex justify-between" htmlFor={soundToggleId}>
        <span>Sound</span>
        <input
          id={soundToggleId}
          type="checkbox"
          checked={sound}
          aria-label="Sound"
          onChange={() => setSound(!sound)}
        />
      </label>
      <label className="px-4 pb-2 flex justify-between" htmlFor={networkToggleId}>
        <span>Network</span>
        <input
          id={networkToggleId}
          type="checkbox"
          checked={online}
          aria-label="Network"
          onChange={() => setOnline(!online)}
        />
      </label>
      <label className="px-4 flex justify-between" htmlFor={reduceMotionToggleId}>
        <span>Reduced motion</span>
        <input
          id={reduceMotionToggleId}
          type="checkbox"
          checked={reduceMotion}
          aria-label="Reduced motion"
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </div>
  );
};

export default QuickSettings;
