import React, { useEffect, useRef, useState } from 'react';
import {
  loadProfiles,
  renameProfile,
  deleteProfile,
  SavedProfile,
  ServiceData,
} from '../../utils/bleProfiles';
import useBluetoothController from '../../hooks/useBluetoothController';
import {
  forgetDevice,
  updateCachedDeviceName,
} from '../../utils/bluetoothManager';

const PAIRING_STEPS: Array<{
  key: 'request' | 'connect' | 'discover' | 'complete';
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'request',
    label: 'Request device',
    description: 'Grant permission to scan nearby Bluetooth devices.',
    icon: '🔍',
  },
  {
    key: 'connect',
    label: 'Secure pairing',
    description: 'Establishing an encrypted connection to the sensor.',
    icon: '🔗',
  },
  {
    key: 'discover',
    label: 'Discover services',
    description: 'Reading GATT characteristics exposed by the device.',
    icon: '🛰️',
  },
  {
    key: 'complete',
    label: 'Ready',
    description: 'Profile cached locally for quick reconnects.',
    icon: '✅',
  },
];

const STATUS_MESSAGES: Record<string, string> = {
  idle: 'Ready to start a scan.',
  requesting: 'Awaiting browser permission…',
  connecting: 'Pairing with device…',
  discovering: 'Reading device services…',
  connected: 'Connected and streaming cached data.',
  disconnected: 'Device is disconnected but cached data is available.',
  reconnecting: 'Device went to sleep. Attempting to reconnect…',
  error: 'Connection failed. Review the message below.',
};

type StepStatus = 'complete' | 'active' | 'pending' | 'error';

const BleSensor: React.FC = () => {
  const {
    supported,
    status,
    step,
    busy,
    deviceName,
    services,
    batteryLevel,
    error,
    canRetry,
    startPairing,
    retryPairing,
    disconnectDevice,
    fromCache,
  } = useBluetoothController();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const refreshProfiles = async () => {
    const list = await loadProfiles();
    setProfiles(list);
  };

  useEffect(() => {
    refreshProfiles();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ble-profiles');
      bc.onmessage = () => refreshProfiles();
      bcRef.current = bc;
      return () => bc.close();
    }
    return () => {};
  }, []);

  const handlePrimaryAction = () => {
    if (status === 'connected') {
      disconnectDevice();
      return;
    }
    if (canRetry) {
      retryPairing();
      return;
    }
    startPairing();
  };

  const primaryLabel = (() => {
    if (status === 'connected') return 'Disconnect';
    if (canRetry) return 'Retry';
    return 'Scan for Devices';
  })();

  const activeIndex = Math.max(
    0,
    PAIRING_STEPS.findIndex((item) => item.key === step)
  );

  const renderStepStatus = (index: number): StepStatus => {
    if (index < activeIndex) return 'complete';
    if (index === activeIndex) {
      if (status === 'error') return 'error';
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      {!supported && (
        <p className="mb-4 rounded border border-yellow-400/50 bg-yellow-900/40 p-2 text-sm text-yellow-200">
          Web Bluetooth is not supported in this browser. The simulator will
          only show cached data.
        </p>
      )}

      <div className="mb-4 rounded border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold" data-testid="device-name">
              {deviceName || 'No device connected'}
            </p>
            <p className="text-sm text-slate-300">
              {STATUS_MESSAGES[status] || STATUS_MESSAGES.idle}
            </p>
            {fromCache && status !== 'connected' && (
              <p className="mt-1 text-xs text-slate-400">
                Using cached services from the previous session.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {batteryLevel !== null && batteryLevel !== undefined && (
              <span
                className="rounded bg-slate-800 px-2 py-1 text-sm"
                data-testid="battery-level"
              >
                <span aria-hidden="true" className="mr-1">
                  🔋
                </span>
                Battery {batteryLevel}%
              </span>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!supported || busy}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium disabled:opacity-60"
            >
              {busy ? 'Working…' : primaryLabel}
            </button>
          </div>
        </div>
      </div>

      <ul className="mb-4 space-y-2" aria-label="Pairing progress">
        {PAIRING_STEPS.map((item, index) => {
          const state = renderStepStatus(index);
          const statusLabel =
            state === 'complete'
              ? 'Done'
              : state === 'active'
                ? 'In progress'
                : state === 'error'
                  ? 'Needs retry'
                  : 'Pending';
          const stateClass =
            state === 'active'
              ? 'bg-slate-900/80 border-slate-700'
              : state === 'complete'
                ? 'bg-slate-900/40 border-slate-700/70'
                : state === 'error'
                  ? 'bg-red-900/30 border-red-600/60'
                  : 'bg-slate-900/20 border-slate-800';
          return (
            <li
              key={item.key}
              data-testid={`pairing-step-${item.key}`}
              className={`flex items-start gap-3 rounded border p-3 text-sm ${stateClass}`}
            >
              <span aria-hidden="true" className="text-lg">
                {item.icon}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-slate-300">{item.description}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-slate-300">
                {statusLabel}
              </span>
            </li>
          );
        })}
      </ul>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-500/40 bg-red-900/40 p-3 text-sm text-red-100"
        >
          <p>{error}</p>
          {canRetry && (
            <button
              type="button"
              onClick={() => retryPairing()}
              className="mt-2 rounded bg-red-500/80 px-3 py-1 text-sm font-medium text-white hover:bg-red-500"
            >
              Retry pairing
            </button>
          )}
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Discovered services</h2>
        {services.length === 0 ? (
          <p className="text-sm text-slate-300">
            No services have been read yet. Start a scan to inspect a device profile.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="service-list">
            {services.map((service: ServiceData) => (
              <li key={service.uuid} className="rounded border border-slate-800 p-3">
                <p className="mb-2 font-semibold">Service: {service.uuid}</p>
                <ul className="space-y-1 text-sm">
                  {service.characteristics.map((char) => (
                    <li key={char.uuid} className="flex flex-col rounded bg-slate-900/60 p-2">
                      <span className="font-mono text-xs text-slate-300">{char.uuid}</span>
                      <span className="text-sm text-slate-100">{char.value}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profiles.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Saved profiles</h2>
          <ul className="space-y-2 text-sm">
            {profiles.map((profile) => (
              <li
                key={profile.deviceId}
                className="flex flex-wrap items-center gap-2 rounded border border-slate-800 p-2"
              >
                <input
                  defaultValue={profile.name}
                  onBlur={async (event) => {
                    const value = event.target.value.trim();
                    if (!value) return;
                    await renameProfile(profile.deviceId, value);
                    updateCachedDeviceName(profile.deviceId, value);
                    bcRef.current?.postMessage('update');
                    refreshProfiles();
                  }}
                  className="w-48 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                />
                {profile.batteryLevel !== undefined && profile.batteryLevel !== null && (
                  <span className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-300">
                    🔋 {profile.batteryLevel}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    forgetDevice(profile.deviceId);
                    await deleteProfile(profile.deviceId);
                    bcRef.current?.postMessage('update');
                    refreshProfiles();
                  }}
                  className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;
