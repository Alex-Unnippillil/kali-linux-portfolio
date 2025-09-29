"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { focusRing } from '../../styles/theme';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const soundId = 'quick-settings-sound';
  const networkId = 'quick-settings-network';
  const motionId = 'quick-settings-motion';
  const soundLabelId = 'quick-settings-sound-label';
  const networkLabelId = 'quick-settings-network-label';
  const motionLabelId = 'quick-settings-motion-label';

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
          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition ${focusRing.default}`}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label className="px-4 pb-2 flex items-center justify-between gap-3" htmlFor={soundId}>
        <span id={soundLabelId}>Sound</span>
        <input
          id={soundId}
          className={`h-5 w-5 rounded ${focusRing.tight}`}
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-labelledby={soundLabelId}
        />
      </label>
      <label className="px-4 pb-2 flex items-center justify-between gap-3" htmlFor={networkId}>
        <span id={networkLabelId}>Network</span>
        <input
          id={networkId}
          className={`h-5 w-5 rounded ${focusRing.tight}`}
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-labelledby={networkLabelId}
        />
      </label>
      <label className="px-4 flex items-center justify-between gap-3" htmlFor={motionId}>
        <span id={motionLabelId}>Reduced motion</span>
        <input
          id={motionId}
          className={`h-5 w-5 rounded ${focusRing.tight}`}
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-labelledby={motionLabelId}
        />
      </label>
    </div>
  );
};

export default QuickSettings;
