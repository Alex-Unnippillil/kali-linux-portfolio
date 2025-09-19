"use client";

import { useEffect, useId } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { dndActive, dndScheduleActive, dndOverride, toggleDnd } = useSettings();
  const dndLabelId = useId();
  const dndControlId = useId();
  const dndStatusId = useId();
  const soundLabelId = useId();
  const soundControlId = useId();
  const networkLabelId = useId();
  const networkControlId = useId();
  const reduceMotionLabelId = useId();
  const reduceMotionControlId = useId();

  const dndStatus = (() => {
    if (dndOverride === 'on') return 'Manual';
    if (dndOverride === 'off') return 'Override off';
    if (dndScheduleActive) return 'Scheduled';
    return 'Off';
  })();

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
      <label
        htmlFor={dndControlId}
        className="px-4 pb-2 flex justify-between items-center gap-4 cursor-pointer"
      >
        <span className="flex flex-col">
          <span id={dndLabelId}>Do Not Disturb</span>
          <span id={dndStatusId} className="text-xs text-white/70">
            {dndStatus}
          </span>
        </span>
        <input
          id={dndControlId}
          type="checkbox"
          aria-labelledby={dndLabelId}
          aria-describedby={dndStatusId}
          checked={dndActive}
          onChange={() => toggleDnd()}
        />
      </label>
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <label
        htmlFor={soundControlId}
        className="px-4 pb-2 flex justify-between items-center cursor-pointer"
      >
        <span id={soundLabelId}>Sound</span>
        <input
          id={soundControlId}
          type="checkbox"
          aria-labelledby={soundLabelId}
          checked={sound}
          onChange={() => setSound(!sound)}
        />
      </label>
      <label
        htmlFor={networkControlId}
        className="px-4 pb-2 flex justify-between items-center cursor-pointer"
      >
        <span id={networkLabelId}>Network</span>
        <input
          id={networkControlId}
          type="checkbox"
          aria-labelledby={networkLabelId}
          checked={online}
          onChange={() => setOnline(!online)}
        />
      </label>
      <label
        htmlFor={reduceMotionControlId}
        className="px-4 flex justify-between items-center cursor-pointer"
      >
        <span id={reduceMotionLabelId}>Reduced motion</span>
        <input
          id={reduceMotionControlId}
          type="checkbox"
          aria-labelledby={reduceMotionLabelId}
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </label>
    </div>
  );
};

export default QuickSettings;
