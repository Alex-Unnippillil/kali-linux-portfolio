"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useState } from 'react';
import LogoutDialog, { SessionAction } from '@/src/components/session/LogoutDialog';

interface Props {
  open: boolean;
  actions?: SessionAction[];
  saveSession?: () => void;
}

const QuickSettings = ({ open, actions = [], saveSession }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [showLogout, setShowLogout] = useState(false);

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
      {actions.length > 0 && (
        <div className="px-4 pt-2">
          <button className="w-full" onClick={() => setShowLogout(true)}>
            Power
          </button>
        </div>
      )}
      <LogoutDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        actions={actions}
        saveSession={saveSession}
      />
    </div>
  );
};

export default QuickSettings;
