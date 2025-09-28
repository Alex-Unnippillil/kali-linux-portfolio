"use client";

import { useEffect, useId, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { isDarkTheme } from '../../utils/theme';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const { theme, setTheme, allowNetwork, setAllowNetwork, reducedMotion, setReducedMotion } = useSettings();
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [nightTintEnabled, setNightTintEnabled] = useState(false);
  const [volume, setVolume] = useState(70);
  const [brightness, setBrightness] = useState(80);

  const panelId = useId();
  const isDarkMode = isDarkTheme(theme);

  useEffect(() => {
    document.documentElement.classList.toggle('night-tint', nightTintEnabled);
    return () => {
      document.documentElement.classList.remove('night-tint');
    };
  }, [nightTintEnabled]);

  if (!open) {
    return null;
  }

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? 'default' : 'dark');
  };

  return (
    <section
      aria-labelledby={`${panelId}-title`}
      className="absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 w-72"
      role="dialog"
    >
      <h2 id={`${panelId}-title`} className="sr-only">
        Quick settings
      </h2>
      <div className="px-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <label htmlFor={`${panelId}-wifi`} className="text-sm font-medium text-white">
                Wi-Fi
              </label>
              <span className="text-xs text-white/70">{allowNetwork ? 'Connected' : 'Offline'}</span>
            </div>
            <input
              id={`${panelId}-wifi`}
              aria-checked={allowNetwork}
              aria-label="Toggle Wi-Fi"
              checked={allowNetwork}
              className="h-4 w-4 accent-current"
              onChange={() => setAllowNetwork(!allowNetwork)}
              role="switch"
              type="checkbox"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <label htmlFor={`${panelId}-bluetooth`} className="text-sm font-medium text-white">
                Bluetooth
              </label>
              <span className="text-xs text-white/70">{bluetoothEnabled ? 'Discoverable' : 'Off'}</span>
            </div>
            <input
              id={`${panelId}-bluetooth`}
              aria-checked={bluetoothEnabled}
              aria-label="Toggle Bluetooth"
              checked={bluetoothEnabled}
              className="h-4 w-4 accent-current"
              onChange={() => setBluetoothEnabled((prev) => !prev)}
              role="switch"
              type="checkbox"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <label htmlFor={`${panelId}-dark-mode`} className="text-sm font-medium text-white">
                Dark mode
              </label>
              <span className="text-xs text-white/70">{isDarkMode ? 'Dark' : 'Light'}</span>
            </div>
            <input
              id={`${panelId}-dark-mode`}
              aria-checked={isDarkMode}
              aria-label="Toggle dark mode"
              checked={isDarkMode}
              className="h-4 w-4 accent-current"
              onChange={toggleDarkMode}
              role="switch"
              type="checkbox"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <label htmlFor={`${panelId}-night-tint`} className="text-sm font-medium text-white">
                Night tint
              </label>
              <span className="text-xs text-white/70">{nightTintEnabled ? 'Warm' : 'Neutral'}</span>
            </div>
            <input
              id={`${panelId}-night-tint`}
              aria-checked={nightTintEnabled}
              aria-label="Toggle night tint"
              checked={nightTintEnabled}
              className="h-4 w-4 accent-current"
              onChange={() => setNightTintEnabled((prev) => !prev)}
              role="switch"
              type="checkbox"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <label htmlFor={`${panelId}-reduced-motion`} className="text-sm font-medium text-white">
                Reduced motion
              </label>
              <span className="text-xs text-white/70">{reducedMotion ? 'Enabled' : 'Default'}</span>
            </div>
            <input
              id={`${panelId}-reduced-motion`}
              aria-checked={reducedMotion}
              aria-label="Toggle reduced motion"
              checked={reducedMotion}
              className="h-4 w-4 accent-current"
              onChange={() => setReducedMotion(!reducedMotion)}
              role="switch"
              type="checkbox"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-white/70">
              <label htmlFor={`${panelId}-brightness`} className="text-sm font-medium text-white">
                Brightness
              </label>
              <span aria-live="polite">{brightness}%</span>
            </div>
            <input
              id={`${panelId}-brightness`}
              aria-label="Adjust screen brightness"
              className="w-full accent-current"
              max={100}
              min={0}
              onChange={(event) => setBrightness(Number(event.target.value))}
              type="range"
              value={brightness}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-white/70">
              <label htmlFor={`${panelId}-volume`} className="text-sm font-medium text-white">
                Volume
              </label>
              <span aria-live="polite">{volume}%</span>
            </div>
            <input
              id={`${panelId}-volume`}
              aria-label="Adjust volume"
              className="w-full accent-current"
              max={100}
              min={0}
              onChange={(event) => setVolume(Number(event.target.value))}
              type="range"
              value={volume}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickSettings;
