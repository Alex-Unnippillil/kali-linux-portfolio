"use client";

import usePersistentState from '../../hooks/usePersistentState';
import useFocusTrap from '../../hooks/useFocusTrap';
import useEscapeKey from '../../hooks/useEscapeKey';
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const QuickSettings = ({ open, onClose }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);
  useEscapeKey(onClose, open);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label="Quick settings"
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          type="button"
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label className="px-4 pb-2 flex items-center justify-between gap-4">
        <span className="flex-1">Sound</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Sound"
        />
      </label>
      <label className="px-4 pb-2 flex items-center justify-between gap-4">
        <span className="flex-1">Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Network"
        />
      </label>
      <label className="px-4 flex items-center justify-between gap-4">
        <span className="flex-1">Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Reduced motion"
        />
      </label>
    </div>
  );
};

export default QuickSettings;
