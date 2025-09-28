"use client";

import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import { isDarkTheme } from '../../utils/theme';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const {
    theme,
    setTheme,
    allowNetwork,
    setAllowNetwork,
    reducedMotion,
    setReducedMotion,
  } = useSettings();

  const [bluetoothEnabled, setBluetoothEnabled] = usePersistentState('qs-bluetooth', true);
  const [nightTintEnabled, setNightTintEnabled] = usePersistentState('qs-night-tint', false);
  const [volume, setVolume] = usePersistentState('qs-volume', 70);
  const [brightness, setBrightness] = usePersistentState('qs-brightness', 80);

  useEffect(() => {
    const normalizedBrightness = 0.5 + (brightness / 100) * 0.7;
    document.documentElement.style.setProperty(
      '--qs-brightness',
      normalizedBrightness.toFixed(2)
    );
  }, [brightness]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--qs-night-tint-opacity',
      nightTintEnabled ? '0.35' : '0'
    );
  }, [nightTintEnabled]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--qs-volume-level',
      (volume / 100).toFixed(2)
    );
  }, [volume]);

  const darkModeEnabled = isDarkTheme(theme);

  const toggleClasses = (active: boolean) =>
    `flex items-center justify-between w-full rounded px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
      active ? 'bg-black/50 text-white shadow-inner' : 'bg-black/20 text-ubt-grey hover:bg-black/30'
    }`;

  return (
    <div
      className={`absolute top-9 right-3 z-50 w-64 rounded-md border border-black border-opacity-20 bg-ub-cool-grey py-3 shadow ${
        open ? 'animateShow' : 'hidden'
      }`}
      role="menu"
      aria-label="Quick settings"
      aria-hidden={!open}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="space-y-1 px-3 pb-3">
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={allowNetwork}
          className={toggleClasses(allowNetwork)}
          onClick={() => setAllowNetwork(!allowNetwork)}
        >
          <span className="font-medium">Wi-Fi</span>
          <span className="text-xs uppercase tracking-wide opacity-80">
            {allowNetwork ? 'Connected' : 'Off'}
          </span>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={bluetoothEnabled}
          className={toggleClasses(bluetoothEnabled)}
          onClick={() => setBluetoothEnabled(!bluetoothEnabled)}
        >
          <span className="font-medium">Bluetooth</span>
          <span className="text-xs uppercase tracking-wide opacity-80">
            {bluetoothEnabled ? 'Discoverable' : 'Off'}
          </span>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={darkModeEnabled}
          className={toggleClasses(darkModeEnabled)}
          onClick={() => setTheme(darkModeEnabled ? 'default' : 'dark')}
        >
          <span className="font-medium">Dark mode</span>
          <span className="text-xs uppercase tracking-wide opacity-80">
            {darkModeEnabled ? 'On' : 'Off'}
          </span>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={nightTintEnabled}
          className={toggleClasses(nightTintEnabled)}
          onClick={() => setNightTintEnabled(!nightTintEnabled)}
        >
          <span className="font-medium">Night tint</span>
          <span className="text-xs uppercase tracking-wide opacity-80">
            {nightTintEnabled ? 'Warm' : 'Neutral'}
          </span>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={reducedMotion}
          className={toggleClasses(reducedMotion)}
          onClick={() => setReducedMotion(!reducedMotion)}
        >
          <span className="font-medium">Reduced motion</span>
          <span className="text-xs uppercase tracking-wide opacity-80">
            {reducedMotion ? 'On' : 'Off'}
          </span>
        </button>
      </div>

      <div className="space-y-3 border-t border-white/10 px-3 pt-3" role="none">
        <div role="group" aria-labelledby="quick-settings-volume-label">
          <div className="flex items-center justify-between">
            <span id="quick-settings-volume-label" className="text-sm font-medium text-white">
              Volume
            </span>
            <span className="text-xs text-ubt-grey">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="ubuntu-slider mt-2 w-full"
            aria-valuenow={volume}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="quick-settings-volume-label"
            style={{ backgroundSize: `${Math.max(volume, 5)}% 3px` }}
          />
        </div>
        <div role="group" aria-labelledby="quick-settings-brightness-label">
          <div className="flex items-center justify-between">
            <span id="quick-settings-brightness-label" className="text-sm font-medium text-white">
              Brightness
            </span>
            <span className="text-xs text-ubt-grey">{brightness}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))}
            className="ubuntu-slider mt-2 w-full"
            aria-valuenow={brightness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby="quick-settings-brightness-label"
            style={{ backgroundSize: `${Math.max(brightness, 5)}% 3px` }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
