"use client";

import { useEffect } from 'react';
import { BC_EVENTS, publish, subscribe } from '@/src/lib/bc';
import { useTheme } from '../../hooks/useTheme';
import usePersistentState from '../../hooks/usePersistentState';
import { isDarkTheme } from '../../utils/theme';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const { theme, setTheme } = useTheme();
  const [dnd, setDnd] = usePersistentState<boolean>(
    'qs-dnd',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    const unsubscribe = subscribe<boolean>(BC_EVENTS.dnd, next => {
      setDnd(next);
    });
    return () => unsubscribe();
  }, [setDnd]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const themeLabel = isDarkTheme(theme) ? 'Dark' : 'Light';

  const toggleTheme = () => {
    const next = isDarkTheme(theme) ? 'default' : 'dark';
    setTheme(next);
  };

  const toggleDnd = () => {
    const next = !dnd;
    setDnd(next);
    publish<boolean>(BC_EVENTS.dnd, next);
  };

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button className="w-full flex justify-between" onClick={toggleTheme}>
          <span>Theme</span>
          <span>{themeLabel}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Do Not Disturb</span>
        <input type="checkbox" checked={dnd} onChange={toggleDnd} />
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
    </div>
  );
};

export default QuickSettings;
