"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useMemo } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const { theme, setTheme, reducedMotion, setReducedMotion, allowNetwork, setAllowNetwork } =
    useSettings();
  const themeOptions = useMemo(
    () => [
      { value: 'kali-dark', label: 'Kali Dark' },
      { value: 'kali-blue-deep', label: 'Kali Blue Deep' },
    ],
    [],
  );

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-3">
        <span className="block text-sm text-ubt-grey mb-1">Theme</span>
        <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-1">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => setTheme(option.value)}
              className={`flex w-full justify-between rounded px-2 py-1 text-left transition-colors duration-150 ${
                theme === option.value
                  ? 'bg-ub-lite-abrgn text-white'
                  : 'bg-transparent text-ubt-grey hover:bg-ub-lite-abrgn/40'
              }`}
            >
              <span>{option.label}</span>
              {theme === option.value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          checked={allowNetwork}
          onChange={() => setAllowNetwork(!allowNetwork)}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={() => setReducedMotion(!reducedMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
