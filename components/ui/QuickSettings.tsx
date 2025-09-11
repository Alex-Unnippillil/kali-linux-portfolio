"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import ThemeToggle from '../../src/components/ThemeToggle';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

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
        <ThemeToggle />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input
          aria-label="Toggle sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          aria-label="Toggle network"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          aria-label="Toggle reduced motion"
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
