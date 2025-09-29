"use client";

import { useMemo } from 'react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const {
    ready,
    theme,
    toggleThemeMode,
    sound,
    setSoundEnabled,
    networkEnabled,
    setNetworkEnabled,
    reducedMotion,
    setReducedMotionEnabled,
    highContrast,
    setHighContrastEnabled,
  } = useFeatureFlags();

  const isDark = useMemo(() => theme === 'dark', [theme]);
  const networkLabel = networkEnabled ? 'Online' : 'Offline';

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          type="button"
          aria-pressed={isDark}
          onClick={toggleThemeMode}
          disabled={!ready}
        >
          <span>Theme</span>
          <span>{isDark ? 'Dark' : 'Light'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSoundEnabled(!sound)}
          disabled={!ready}
          aria-label="Toggle system sound"
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ubt-grey">{networkLabel}</span>
          <input
            type="checkbox"
            checked={networkEnabled}
            onChange={() => setNetworkEnabled(!networkEnabled)}
            disabled={!ready}
            aria-label="Toggle external network access"
          />
        </div>
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={() => setReducedMotionEnabled(!reducedMotion)}
          disabled={!ready}
          aria-label="Toggle reduced motion"
        />
      </div>
      <div className="px-4 pt-2 flex justify-between">
        <span>High contrast</span>
        <input
          type="checkbox"
          checked={highContrast}
          onChange={() => setHighContrastEnabled(!highContrast)}
          disabled={!ready}
          aria-label="Toggle high contrast mode"
        />
      </div>
    </div>
  );
};

export default QuickSettings;
