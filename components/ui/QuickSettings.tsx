"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { density, setDensity, radius, setRadius, shadow, setShadow } = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-[var(--radius)] top-9 right-3 border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
      style={{ boxShadow: 'var(--shadow)', padding: 'var(--space-4)' }}
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
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Density</span>
        <select value={density} onChange={(e) => setDensity(e.target.value as any)}>
          <option value="regular">Regular</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div className="px-4 pb-2 flex justify-between items-center">
        <span>Radius</span>
        <input
          type="range"
          min={0}
          max={32}
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value))}
        />
      </div>
      <div className="px-4 flex justify-between items-center">
        <span>Shadow</span>
        <input
          type="range"
          min={0}
          max={24}
          value={shadow}
          onChange={(e) => setShadow(parseInt(e.target.value))}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
