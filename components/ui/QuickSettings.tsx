"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import useNotifications from '../../hooks/useNotifications';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { isDoNotDisturb, toggleDoNotDisturb } = useNotifications();

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
      <div className="px-4 pb-2 flex items-center justify-between gap-2">
        <label htmlFor="quick-settings-sound">Sound</label>
        <input
          id="quick-settings-sound"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle sound"
        />
      </div>
      <div className="px-4 pb-2 flex items-center justify-between gap-2">
        <label htmlFor="quick-settings-network">Network</label>
        <input
          id="quick-settings-network"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle network"
        />
      </div>
      <div className="px-4 pb-2 flex items-center justify-between gap-2">
        <label htmlFor="quick-settings-dnd">Do Not Disturb</label>
        <span className="flex items-center gap-2 text-xs text-ubt-grey text-opacity-80">
          <span aria-hidden="true">{isDoNotDisturb ? 'On' : 'Off'}</span>
          <input
            id="quick-settings-dnd"
            type="checkbox"
            checked={isDoNotDisturb}
            onChange={() => toggleDoNotDisturb()}
            aria-label={isDoNotDisturb ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
          />
        </span>
      </div>
      <div className="px-4 flex items-center justify-between gap-2 pb-2">
        <label htmlFor="quick-settings-reduce-motion">Reduced motion</label>
        <input
          id="quick-settings-reduce-motion"
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
