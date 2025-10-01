"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { ChangeEvent, useEffect } from 'react';
import { useSafeMode } from '../common/SafeMode';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    enabled: safeModeEnabled,
    requestDisable: requestSafeModeDisable,
    requestEnable: requestSafeModeEnable,
    lastBlockedAction,
  } = useSafeMode();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const handleSafeModeToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    if (next === safeModeEnabled) return;
    if (next) {
      requestSafeModeEnable({
        message:
          'Safe Mode will keep high-risk simulations sandboxed until you explicitly opt out.',
      });
    } else {
      requestSafeModeDisable({
        message:
          'Confirm you are operating in a controlled lab before unlocking simulated attacks.',
      });
    }
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
      <div className="mt-3 border-t border-black/20 pt-3">
        <div className="px-4 flex items-start justify-between gap-3">
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-white">Safe Mode</span>
            <span className="text-[11px] text-slate-200">
              Blocks exploit simulations until you acknowledge the legal notice.
            </span>
            {safeModeEnabled && lastBlockedAction && (
              <span className="mt-1 text-[10px] text-ubt-blue/70">
                Last blocked: {lastBlockedAction.summary}
              </span>
            )}
          </div>
          <input
            type="checkbox"
            checked={safeModeEnabled}
            onChange={handleSafeModeToggle}
            aria-label="Toggle safe mode"
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
