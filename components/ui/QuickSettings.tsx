"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import ToggleSwitch from '../ToggleSwitch';
import { useMediaKeys } from '../../hooks/useMediaKeys';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [showNotifications, setShowNotifications] = usePersistentState('qs-show-notifications', false);
  const { volume, setVolume, enabled, setEnabled } = useMediaKeys();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <>
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
      <div className="px-4 pb-2">
        <div className="flex justify-between mb-2">
          <span>Sound</span>
          <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          className="ubuntu-slider w-full"
          aria-label="Volume"
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Show notifications</span>
        <ToggleSwitch
          checked={showNotifications}
          onChange={setShowNotifications}
          ariaLabel="Show notifications"
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Handle multimedia keys</span>
        <ToggleSwitch
          checked={enabled}
          onChange={setEnabled}
          ariaLabel="Handle multimedia keys"
        />
      </div>
    </div>
    </>
  );
};

export default QuickSettings;
