"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useState } from 'react';
import { setTheme as applyTheme } from '../../utils/theme';
import { setAllowNetwork } from '../../utils/settingsStore';

interface Props {
  open: boolean;
  onLogout?: () => void;
}

const QuickSettings = ({ open, onLogout }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [showLogout, setShowLogout] = useState(false);
  const [session, setSession] = useState<'xfce' | 'undercover' | 'safe'>('xfce');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const handleLogout = async () => {
    switch (session) {
      case 'xfce':
        applyTheme('default');
        await setAllowNetwork(true);
        break;
      case 'undercover':
        applyTheme('dark');
        await setAllowNetwork(true);
        break;
      case 'safe':
        applyTheme('dark');
        await setAllowNetwork(false);
        break;
    }
    window.localStorage.setItem('session', session);
    onLogout?.();
  };

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
      <div className="px-4 pt-2 border-t border-gray-600 mt-2">
        {showLogout ? (
          <div>
            <p className="mb-2">Session</p>
            <label className="block mb-1">
              <input
                type="radio"
                name="session"
                value="xfce"
                checked={session === 'xfce'}
                onChange={() => setSession('xfce')}
              />{' '}
              Xfce
            </label>
            <label className="block mb-1">
              <input
                type="radio"
                name="session"
                value="undercover"
                checked={session === 'undercover'}
                onChange={() => setSession('undercover')}
              />{' '}
              Undercover
            </label>
            <label className="block mb-2">
              <input
                type="radio"
                name="session"
                value="safe"
                checked={session === 'safe'}
                onChange={() => setSession('safe')}
              />{' '}
              Safe mode
            </label>
            <button
              className="w-full bg-red-600 text-white rounded px-2 py-1"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        ) : (
          <button className="w-full text-left" onClick={() => setShowLogout(true)}>
            Log out...
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickSettings;
