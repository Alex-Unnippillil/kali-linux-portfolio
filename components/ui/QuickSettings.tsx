"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onOpenUserSwitcher?: () => void;
  userSwitcherEnabled?: boolean;
}

const QuickSettings = ({
  open,
  onOpenUserSwitcher,
  userSwitcherEnabled = false,
}: Props) => {
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
      {userSwitcherEnabled && (
        <div className="mt-3 border-t border-black border-opacity-20 pt-3 px-4 text-sm">
          <button
            type="button"
            onClick={onOpenUserSwitcher}
            className="w-full rounded border border-transparent bg-black bg-opacity-20 px-3 py-2 text-left hover:bg-opacity-30 focus:border-ubt-grey focus:outline-none"
          >
            Switch user
          </button>
          <p className="mt-2 text-xs text-ubt-grey">
            Hop between sessions without logging out. Workspaces resume when
            you return.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickSettings;
