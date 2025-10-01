"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface StatusSnapshot {
  online: boolean;
  isOnlineSimulated: boolean;
  batteryLevel: number;
  batteryCharging: boolean;
  isBatterySimulated: boolean;
}

interface Props {
  open: boolean;
  status: StatusSnapshot;
  supportsDeviceNetwork: boolean;
  supportsDeviceBattery: boolean;
  onNetworkToggle: (online: boolean) => void;
  onUseDeviceNetwork: () => void;
  onBatteryLevelChange: (level: number) => void;
  onBatteryChargingChange: (charging: boolean) => void;
  onUseDeviceBattery: () => void;
}

const QuickSettings = ({
  open,
  status,
  supportsDeviceNetwork,
  supportsDeviceBattery,
  onNetworkToggle,
  onUseDeviceNetwork,
  onBatteryLevelChange,
  onBatteryChargingChange,
  onUseDeviceBattery,
}: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const batteryPercent = Math.round(Math.max(0, Math.min(1, status.batteryLevel)) * 100);
  const soundToggleId = 'quick-settings-sound-toggle';
  const soundLabelId = 'quick-settings-sound-label';
  const networkToggleId = 'quick-settings-network-toggle';
  const networkLabelId = 'quick-settings-network-label';
  const chargingToggleId = 'quick-settings-battery-charging-toggle';
  const chargingLabelId = 'quick-settings-battery-charging-label';
  const reduceMotionToggleId = 'quick-settings-reduce-motion-toggle';
  const reduceMotionLabelId = 'quick-settings-reduce-motion-label';

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
      <div className="px-4 pb-2 flex items-center justify-between">
        <label id={soundLabelId} htmlFor={soundToggleId}>
          Sound
        </label>
        <input
          id={soundToggleId}
          type="checkbox"
          checked={sound}
          aria-labelledby={soundLabelId}
          onChange={() => setSound(!sound)}
        />
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <label id={networkLabelId} htmlFor={networkToggleId}>
            Network
          </label>
          <input
            id={networkToggleId}
            type="checkbox"
            checked={status.online}
            onChange={(event) => onNetworkToggle(event.target.checked)}
            aria-label={status.online ? 'Simulate offline mode' : 'Simulate online mode'}
            aria-describedby="quick-settings-network-hint"
            aria-labelledby={networkLabelId}
          />
        </div>
        <p
          id="quick-settings-network-hint"
          className="mt-1 text-[10px] leading-relaxed text-gray-300"
        >
          {status.isOnlineSimulated
            ? 'Showing simulated connectivity so demos stay predictable.'
            : 'Live status from browser APIs. Toggle to simulate offline mode.'}
        </p>
        <button
          type="button"
          className="mt-2 w-full rounded bg-black/30 py-1 text-[11px] text-white transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onUseDeviceNetwork}
          disabled={!supportsDeviceNetwork || !status.isOnlineSimulated}
        >
          {supportsDeviceNetwork ? 'Use device network' : 'Device network unavailable'}
        </button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <span>Battery</span>
          <span className="text-[11px] text-gray-200">{batteryPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={batteryPercent}
          className="mt-2 h-1 w-full cursor-pointer accent-ubt-blue"
          aria-label="Adjust simulated battery level"
          onChange={(event) => onBatteryLevelChange(Number(event.target.value) / 100)}
        />
        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
          <label
            className="text-white normal-case"
            id={chargingLabelId}
            htmlFor={chargingToggleId}
          >
            Charging
          </label>
          <input
            id={chargingToggleId}
            type="checkbox"
            checked={status.batteryCharging}
            onChange={(event) => onBatteryChargingChange(event.target.checked)}
            aria-label={status.batteryCharging ? 'Simulate unplugged battery' : 'Simulate charging battery'}
            aria-describedby="quick-settings-battery-hint"
            aria-labelledby={chargingLabelId}
          />
        </div>
        <p
          id="quick-settings-battery-hint"
          className="mt-1 text-[10px] leading-relaxed text-gray-300"
        >
          {status.isBatterySimulated
            ? 'Status bar is using simulated power data.'
            : 'Using live battery readings when supported.'}
        </p>
        <button
          type="button"
          className="mt-2 w-full rounded bg-black/30 py-1 text-[11px] text-white transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onUseDeviceBattery}
          disabled={!supportsDeviceBattery || !status.isBatterySimulated}
        >
          {supportsDeviceBattery ? 'Use device battery' : 'Device battery unavailable'}
        </button>
      </div>
      <div className="px-4 flex items-center justify-between">
        <label id={reduceMotionLabelId} htmlFor={reduceMotionToggleId}>
          Reduced motion
        </label>
        <input
          id={reduceMotionToggleId}
          type="checkbox"
          checked={reduceMotion}
          aria-labelledby={reduceMotionLabelId}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
