"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { usePrivacyMode } from '../../hooks/usePrivacyMode';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { enabled: privacyEnabled, toggle: togglePrivacyMode, revealTemporarily, temporarilyRevealed } =
    usePrivacyMode();
  const soundId = 'quick-settings-sound';
  const networkId = 'quick-settings-network';
  const privacyId = 'quick-settings-privacy';
  const reduceMotionId = 'quick-settings-reduce-motion';

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
      <label className="px-4 pb-2 flex justify-between items-center" htmlFor={soundId}>
        <span>Sound</span>
        <input
          id={soundId}
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle system sound"
        />
      </label>
      <label className="px-4 pb-2 flex justify-between items-center" htmlFor={networkId}>
        <span>Network</span>
        <input
          id={networkId}
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle network availability"
        />
      </label>
      <label className="px-4 pb-2 flex justify-between items-center" htmlFor={privacyId}>
        <span>Privacy mode</span>
        <input
          id={privacyId}
          type="checkbox"
          checked={privacyEnabled}
          onChange={() => togglePrivacyMode()}
          aria-label="Toggle privacy mode"
        />
      </label>
      {privacyEnabled && (
        <div className="px-4 pb-2">
          <button
            type="button"
            className="w-full rounded bg-ub-grey px-3 py-1 text-left text-sm text-ubt-grey transition hover:bg-ub-cool-grey disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => revealTemporarily()}
            disabled={temporarilyRevealed}
          >
            {temporarilyRevealed ? 'Content visible…' : 'Unhide for 10s'}
          </button>
        </div>
      )}
      <label className="px-4 flex justify-between items-center" htmlFor={reduceMotionId}>
        <span>Reduced motion</span>
        <input
          id={reduceMotionId}
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Toggle reduced motion"
        />
      </label>
    </div>
  );
};

export default QuickSettings;
