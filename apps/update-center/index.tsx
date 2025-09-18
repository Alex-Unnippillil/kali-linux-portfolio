'use client';

import { useEffect, useMemo, useState } from 'react';
import ToggleSwitch from '../../components/ToggleSwitch';
import {
  DEFER_WINDOW_LABELS,
  DEFER_WINDOW_OPTIONS,
  UPDATE_CHANNEL_OPTIONS,
  DeferWindow,
  UpdateChannel,
  useUpdatePreferences,
} from '../../hooks/useUpdatePreferences';

type ExtendedNetworkInformation = NetworkInformation & { metered?: boolean };
type NavigatorWithConnection = Navigator & {
  connection?: ExtendedNetworkInformation;
  mozConnection?: ExtendedNetworkInformation;
  webkitConnection?: ExtendedNetworkInformation;
};

type ConnectionInfo = {
  supported: boolean;
  metered?: boolean;
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

const CHANNEL_HELP_ID = 'update-channel-help';
const DEFER_HELP_ID = 'update-defer-help';

const resolveConnection = (): ExtendedNetworkInformation | null => {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
};

const describeDeferWindow = (value: DeferWindow): string => {
  if (value === 'off') {
    return 'Updates install as soon as they are ready.';
  }
  return `Updates wait for ${DEFER_WINDOW_LABELS[value]} before installing.`;
};

const describeChannel = (channel: UpdateChannel): string =>
  UPDATE_CHANNEL_OPTIONS.find((option) => option.value === channel)?.description || '';

const describeNetwork = (info: ConnectionInfo): string => {
  if (!info.supported) {
    return 'Network cost detection is unavailable, so downloads assume an unmetered connection.';
  }
  if (info.metered || info.saveData) {
    return 'Current connection looks metered or data-saver is enabled. Large downloads pause unless you allow them.';
  }
  return 'Connection appears unmetered. Background downloads can run without extra charges.';
};

const formatEffectiveType = (type?: string) => (type ? type.toUpperCase() : undefined);

export default function UpdateCenter() {
  const {
    channel,
    setChannel,
    autoDownload,
    setAutoDownload,
    allowMetered,
    setAllowMetered,
    deferWindow,
    setDeferWindow,
    isReady,
  } = useUpdatePreferences();

  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({ supported: false });

  useEffect(() => {
    const connection = resolveConnection();
    if (!connection) {
      setConnectionInfo({ supported: false });
      return;
    }

    const update = () => {
      setConnectionInfo({
        supported: true,
        metered: typeof connection.metered === 'boolean' ? connection.metered : undefined,
        saveData: connection.saveData,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      });
    };

    update();
    const listener = () => update();
    connection.addEventListener?.('change', listener);

    return () => {
      connection.removeEventListener?.('change', listener);
    };
  }, []);

  const connectionStatus = useMemo(() => {
    if (!connectionInfo.supported) return 'Unknown';
    if (connectionInfo.metered || connectionInfo.saveData) return 'Metered';
    return 'Unmetered';
  }, [connectionInfo]);

  const connectionBadgeClasses = useMemo(() => {
    if (!connectionInfo.supported) return 'bg-ubt-cool-grey text-white';
    return connectionInfo.metered || connectionInfo.saveData
      ? 'bg-ub-orange text-black'
      : 'bg-ub-green text-black';
  }, [connectionInfo]);

  const autoDownloadHelp = autoDownload
    ? 'Downloads update packages in the background so installs are ready when you are.'
    : 'Skips background downloads. You will fetch packages manually before installing.';

  const meteredHelp = allowMetered
    ? 'Updates can download on metered connections. Monitor your data usage when travelling.'
    : 'Downloads pause on metered or data-saver connections to avoid unexpected charges.';

  const networkDetails: string[] = [];
  const effectiveType = formatEffectiveType(connectionInfo.effectiveType);
  if (effectiveType) {
    networkDetails.push(`Effective type: ${effectiveType}`);
  }
  if (typeof connectionInfo.downlink === 'number') {
    networkDetails.push(`Downlink: ${connectionInfo.downlink.toFixed(1)} Mbps`);
  }
  if (connectionInfo.saveData) {
    networkDetails.push('Save-Data mode is enabled.');
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <header className="mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-semibold">Update Center</h1>
        <p className="mt-2 text-sm text-ubt-grey">
          Configure how the desktop fetches simulated system updates. Preferences stay on this device.
        </p>
      </header>

      {!isReady && (
        <p role="status" className="mb-4 text-xs text-ubt-grey">
          Loading saved preferences…
        </p>
      )}

      <div className={`space-y-6 ${isReady ? '' : 'pointer-events-none opacity-50'}`} aria-busy={!isReady}>
        <section className="rounded border border-gray-700 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Channels</h2>
          <div className="mt-3 space-y-2 text-sm">
            <label htmlFor="update-channel-select" className="font-medium">
              Update channel
            </label>
            <select
              id="update-channel-select"
              aria-describedby={CHANNEL_HELP_ID}
              value={channel}
              onChange={(event) => setChannel(event.target.value as UpdateChannel)}
              className="w-full rounded border border-gray-700 bg-ub-cool-grey px-3 py-2 text-white focus:outline-none focus:ring"
            >
              {UPDATE_CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id={CHANNEL_HELP_ID} className="text-xs text-ubt-grey">
              {describeChannel(channel)}
            </p>
          </div>
        </section>

        <section className="rounded border border-gray-700 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Automation</h2>
          <div className="mt-3 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Auto-download updates</p>
                <p id="update-auto-download-help" className="text-xs text-ubt-grey">
                  {autoDownloadHelp}
                </p>
              </div>
              <ToggleSwitch
                checked={autoDownload}
                onChange={(next) => setAutoDownload(next)}
                ariaLabel="Toggle automatic update downloads"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Allow on metered networks</p>
                <p id="update-metered-help" className="text-xs text-ubt-grey">
                  {meteredHelp}
                </p>
              </div>
              <ToggleSwitch
                checked={allowMetered}
                onChange={(next) => setAllowMetered(next)}
                ariaLabel="Allow update downloads on metered connections"
              />
            </div>
          </div>
        </section>

        <section className="rounded border border-gray-700 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Scheduling</h2>
          <div className="mt-3 space-y-2 text-sm">
            <label htmlFor="update-defer-select" className="font-medium">
              Defer window
            </label>
            <select
              id="update-defer-select"
              aria-describedby={DEFER_HELP_ID}
              value={deferWindow}
              onChange={(event) => setDeferWindow(event.target.value as DeferWindow)}
              className="w-full rounded border border-gray-700 bg-ub-cool-grey px-3 py-2 text-white focus:outline-none focus:ring"
            >
              {DEFER_WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id={DEFER_HELP_ID} className="text-xs text-ubt-grey">
              {describeDeferWindow(deferWindow)}
            </p>
          </div>
        </section>

        <section className="rounded border border-gray-700 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Network status</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${connectionBadgeClasses}`}>
                {connectionStatus}
              </span>
              <p className="text-xs text-ubt-grey">{describeNetwork(connectionInfo)}</p>
            </div>
            {networkDetails.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-ubt-grey">
                {networkDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
