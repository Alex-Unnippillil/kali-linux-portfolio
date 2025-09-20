"use client";

import { useEffect } from 'react';
import DensityToggle from '../apps/quick-settings/DensityToggle';
import usePersistentState from '../../hooks/usePersistentState';
import { useDesktop } from '../core/DesktopProvider';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { tokens } = useDesktop();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const rowClass = `flex items-center justify-between rounded-md transition-colors ${tokens.inlineGap} ${tokens.control}`.trim();
  const controlClass = `${tokens.control} w-full flex items-center justify-between rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange/60`.trim();

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md top-9 right-3 shadow border border-black border-opacity-20 transition transform origin-top-right ${
        open ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
      }`}
      aria-hidden={!open}
    >
      <div className={`flex flex-col ${tokens.surface} ${tokens.stackGap}`.trim()}>
        <DensityToggle />
        <button
          className={controlClass}
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          type="button"
        >
          <span className={tokens.text}>Theme</span>
          <span className={tokens.subtleText}>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
        <div className={rowClass}>
          <span className={tokens.text}>Sound</span>
          <input
            type="checkbox"
            checked={sound}
            onChange={() => setSound(!sound)}
            className="form-checkbox"
            aria-label="Toggle sound"
          />
        </div>
        <div className={rowClass}>
          <span className={tokens.text}>Network</span>
          <input
            type="checkbox"
            checked={online}
            onChange={() => setOnline(!online)}
            className="form-checkbox"
            aria-label="Toggle network"
          />
        </div>
        <div className={rowClass}>
          <span className={tokens.text}>Reduced motion</span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={() => setReduceMotion(!reduceMotion)}
            className="form-checkbox"
            aria-label="Toggle reduced motion"
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
