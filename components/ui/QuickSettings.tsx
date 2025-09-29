"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import SettingsDrawer from '../desktop/SettingsDrawer';

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
      className={`absolute top-9 right-3 rounded-xl border border-black/40 bg-ub-cool-grey/95 p-4 shadow-lg backdrop-blur ${
        open ? '' : 'hidden'
      }`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 1rem)',
        width: 'min(22rem, 90vw)',
      }}
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
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle sound"
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle network"
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Toggle quick reduced motion"
        />
      </div>
      <SettingsDrawer />
    </div>
  );
};

export default QuickSettings;
