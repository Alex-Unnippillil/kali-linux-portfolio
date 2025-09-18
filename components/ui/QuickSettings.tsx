"use client";

import { useEffect } from 'react';
import type { RefObject } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import Popover from '../base/Popover';

interface Props {
  open: boolean;
  anchorRef: RefObject<HTMLElement> | null;
  onClose: () => void;
}

const QuickSettings = ({ open, anchorRef, onClose }: Props) => {
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

  if (!open) {
    return null;
  }

  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      ariaLabel="Quick settings"
      className="absolute top-9 right-3 w-60 space-y-3 p-4 text-sm text-ubt-grey"
    >
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        type="button"
      >
        <span>Theme</span>
        <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
      </button>
      <label className="flex w-full items-center justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </label>
      <label className="flex w-full items-center justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </label>
      <label className="flex w-full items-center justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </Popover>
  );
};

export default QuickSettings;
