"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  lockScreen: () => void;
  logOut: () => void;
}

const QuickSettings = ({ open, lockScreen, logOut }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState(
    'qs-reduce-motion',
    false,
  );

  const toggleTheme = () =>
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const toggleSound = () => setSound((s) => !s);
  const toggleOnline = () => setOnline((o) => !o);
  const toggleReduceMotion = () => setReduceMotion((r) => !r);

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
          onClick={toggleTheme}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={toggleSound} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={toggleOnline} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={toggleReduceMotion}
        />
      </div>
      <div className="px-4 pt-2 border-t border-black border-opacity-20 mt-2 space-y-1">
        <button
          type="button"
          className="w-full text-left hover:underline"
          onClick={lockScreen}
        >
          Lock
        </button>
        <button
          type="button"
          className="w-full text-left hover:underline"
          onClick={logOut}
        >
          Log Out
        </button>
        <button
          type="button"
          className="w-full text-left text-gray-600 dark:text-gray-400 cursor-not-allowed"
          disabled
          title="Restart is disabled in this demo"
          aria-disabled="true"
        >
          Restart
        </button>
        <button
          type="button"
          className="w-full text-left text-gray-600 dark:text-gray-400 cursor-not-allowed"
          disabled
          title="Shut Down is disabled in this demo"
          aria-disabled="true"
        >
          Shut Down
        </button>
        <button
          type="button"
          className="w-full text-left text-blue-300 hover:underline pt-1"
          onClick={() => {
            window.localStorage.setItem('settings-open-tab', 'power');
            document.dispatchEvent(
              new CustomEvent('open-settings', { detail: { tab: 'power' } }),
            );
          }}
        >
          Power Manager Settings…
        </button>
      </div>
    </div>
  );
};

export default QuickSettings;
