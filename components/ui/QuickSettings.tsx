"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import {
  ICON_SIZE_DEFAULT,
  ICON_SIZE_EVENT,
  ICON_SIZE_OPTIONS,
  ICON_SIZE_STORAGE_KEY,
  isValidIconSize,
  type IconSize,
} from '../../utils/iconSizeProfiles';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [iconSize, setIconSize] = usePersistentState<IconSize>(
    ICON_SIZE_STORAGE_KEY,
    ICON_SIZE_DEFAULT,
    (value): value is IconSize => isValidIconSize(value),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail = { size: iconSize };
    window.dispatchEvent(new CustomEvent(ICON_SIZE_EVENT, { detail }));
  }, [iconSize]);

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
      <div className="px-4 pt-2 flex justify-between items-center gap-3">
        <span>Icon size</span>
        <select
          className="bg-ub-grey text-white rounded px-2 py-1 text-sm"
          value={iconSize}
          onChange={(event) => {
            const value = event.target.value;
            if (isValidIconSize(value)) {
              setIconSize(value);
            }
          }}
        >
          {ICON_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default QuickSettings;
