"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  openApp?: (id: string) => void;
}

const DiskIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    width="16"
    height="16"
    className={className}
  >
    <path d="M2 0h12l2 2v14H0V0h2zm5 3v4h2V3H7zm5-1H4v5h8V2z" />
  </svg>
);

const QuickSettings = ({ open, openApp }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [mount, setMount] = usePersistentState<'/' | '/home'>('qs-mount', '/');

  const usage = mount === '/' ? 82 : 95; // simulate usage for mounts
  const level = usage >= 90 ? 'urgent' : usage >= 80 ? 'warning' : 'normal';
  const color =
    level === 'urgent'
      ? 'text-red-500'
      : level === 'warning'
      ? 'text-yellow-400'
      : 'text-green-400';

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
      <div className="px-4 pb-2 flex justify-between items-center">
        <div className="flex items-center">
          <DiskIcon className={`w-4 h-4 ${color}`} />
          <select
            aria-label="Select mount"
            className="ml-2 bg-ub-grey text-white"
            value={mount}
            onChange={(e) => setMount(e.target.value as '/' | '/home')}
          >
            <option value="/">/</option>
            <option value="/home">/home</option>
          </select>
        </div>
        <button
          className="text-ubt-blue underline"
          onClick={() => openApp?.('file-explorer')}
        >
          Open
        </button>
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
