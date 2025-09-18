"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, useMemo, useRef } from 'react';
import {
  estimateLifeGainMinutes,
  setPowerSaverEnabled,
} from '../../utils/powerManager';
import { logPowerSaverChange } from '../../utils/analytics';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [powerSaver, setPowerSaver] = usePersistentState(
    'qs-power-saver',
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const firstRenderRef = useRef(true);
  const estimatedGain = useMemo(() => estimateLifeGainMinutes(), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const root = document.documentElement;
    const brightness = powerSaver ? '0.7' : '1';
    root.style.setProperty('--power-saver-brightness', brightness);
    setPowerSaverEnabled(powerSaver);

    if (!firstRenderRef.current) {
      if (powerSaver) {
        logPowerSaverChange(true, estimatedGain);
      } else {
        logPowerSaverChange(false);
      }
    } else {
      firstRenderRef.current = false;
    }

    return () => {
      if (powerSaver) {
        root.style.setProperty('--power-saver-brightness', '1');
      }
    };
  }, [powerSaver, estimatedGain]);

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
      <div className="px-4 pt-2 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span>Power saver</span>
          <input
            type="checkbox"
            aria-label="Power saver"
            checked={powerSaver}
            onChange={() => setPowerSaver(!powerSaver)}
          />
        </div>
        <p className="text-xs text-gray-200">
          {powerSaver
            ? `Active · +${estimatedGain} min est. runtime`
            : `Enable to gain ~${estimatedGain} min of runtime`}
        </p>
      </div>
    </div>
  );
};

export default QuickSettings;
