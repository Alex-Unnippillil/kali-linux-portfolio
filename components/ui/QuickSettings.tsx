"use client";

import { useEffect, useId } from 'react';

import usePersistentState from '../../hooks/usePersistentState';
import Button from './Button';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const soundId = useId();
  const networkId = useId();
  const reducedMotionId = useId();

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
        <Button
          variant="ghost"
          className="flex w-full justify-between text-left text-white hover:bg-white/10"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 pb-2">
        <label htmlFor={soundId}>Sound</label>
        <input
          id={soundId}
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle sound"
        />
      </div>
      <div className="flex items-center justify-between gap-4 px-4 pb-2">
        <label htmlFor={networkId}>Network</label>
        <input
          id={networkId}
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle network"
        />
      </div>
      <div className="flex items-center justify-between gap-4 px-4">
        <label htmlFor={reducedMotionId}>Reduced motion</label>
        <input
          id={reducedMotionId}
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Toggle reduced motion"
        />
      </div>
    </div>
  );
};

export default QuickSettings;
