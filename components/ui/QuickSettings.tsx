"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { notify } from '../../utils/notify';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
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
        <input
          type="checkbox"
          checked={online}
          onChange={() => {
            const next = !online;
            setOnline(next);
            notify({
              title: 'Network',
              body: next ? 'Online' : 'Offline',
              icon: next
                ? '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg'
                : '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg',
            });
          }}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="px-4 pt-2 border-t border-black border-opacity-20 mt-2">
        <button
          className="w-full text-left text-blue-300 hover:underline"
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
