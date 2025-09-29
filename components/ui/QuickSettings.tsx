"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useId } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  const panelHeadingId = useId();
  const displayHeadingId = useId();
  const themeLabelId = useId();
  const themeStateId = useId();
  const systemHeadingId = useId();
  const soundLabelId = useId();
  const soundStateId = useId();
  const networkLabelId = useId();
  const networkStateId = useId();
  const accessibilityHeadingId = useId();
  const motionLabelId = useId();
  const motionStateId = useId();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      aria-labelledby={panelHeadingId}
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
      role="dialog"
    >
      <h1 id={panelHeadingId} className="px-4 pb-3 text-sm font-semibold text-white">
        Quick settings
      </h1>
      <section aria-labelledby={displayHeadingId} className="px-4 pb-4">
        <h2
          id={displayHeadingId}
          className="pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey"
        >
          Display
        </h2>
        <button
          aria-checked={theme === 'dark'}
          aria-describedby={themeStateId}
          aria-labelledby={`${displayHeadingId} ${themeLabelId}`}
          className="flex w-full min-h-[2.5rem] items-center justify-between rounded px-3 text-left transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          role="switch"
          type="button"
        >
          <span id={themeLabelId} className="font-medium text-white">
            Theme
          </span>
          <span id={themeStateId} aria-live="polite" className="text-xs text-ubt-grey">
            {theme === 'light' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
      </section>
      <section aria-labelledby={systemHeadingId} className="px-4 pb-4">
        <h2
          id={systemHeadingId}
          className="pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey"
        >
          System
        </h2>
        <div className="space-y-2">
          <button
            aria-checked={sound}
            aria-describedby={soundStateId}
            aria-labelledby={`${systemHeadingId} ${soundLabelId}`}
            className="flex w-full min-h-[2.5rem] items-center justify-between rounded px-3 text-left transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            onClick={() => setSound(!sound)}
            role="switch"
            type="button"
          >
            <span id={soundLabelId} className="font-medium text-white">
              Sound
            </span>
            <span id={soundStateId} aria-live="polite" className="text-xs text-ubt-grey">
              {sound ? 'On' : 'Muted'}
            </span>
          </button>
          <button
            aria-checked={online}
            aria-describedby={networkStateId}
            aria-labelledby={`${systemHeadingId} ${networkLabelId}`}
            className="flex w-full min-h-[2.5rem] items-center justify-between rounded px-3 text-left transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            onClick={() => setOnline(!online)}
            role="switch"
            type="button"
          >
            <span id={networkLabelId} className="font-medium text-white">
              Network
            </span>
            <span id={networkStateId} aria-live="polite" className="text-xs text-ubt-grey">
              {online ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>
      </section>
      <section aria-labelledby={accessibilityHeadingId} className="px-4">
        <h2
          id={accessibilityHeadingId}
          className="pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey"
        >
          Accessibility
        </h2>
        <button
          aria-checked={reduceMotion}
          aria-describedby={motionStateId}
          aria-labelledby={`${accessibilityHeadingId} ${motionLabelId}`}
          className="flex w-full min-h-[2.5rem] items-center justify-between rounded px-3 text-left transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
          onClick={() => setReduceMotion(!reduceMotion)}
          role="switch"
          type="button"
        >
          <span id={motionLabelId} className="font-medium text-white">
            Reduced motion
          </span>
          <span id={motionStateId} aria-live="polite" className="text-xs text-ubt-grey">
            {reduceMotion ? 'Enabled' : 'Disabled'}
          </span>
        </button>
      </section>
    </div>
  );
};

export default QuickSettings;
