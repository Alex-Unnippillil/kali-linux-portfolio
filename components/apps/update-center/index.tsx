'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import updateManifest from '../../../data/update-center.json';

interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

interface ReleaseChannel {
  id: string;
  label: string;
  description: string;
  currentVersion: string;
  releases: ReleaseNote[];
}

interface UpdateManifest {
  channels: ReleaseChannel[];
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'ready'
  | 'installing'
  | 'restart'
  | 'deferred'
  | 'completed';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const manifest = updateManifest as UpdateManifest;

export default function UpdateCenter(): JSX.Element {
  const channels = manifest.channels;
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    () => channels[0]?.id ?? '',
  );
  const [installedVersions, setInstalledVersions] = useState<Record<string, string>>(() =>
    Object.fromEntries(channels.map((channel) => [channel.id, channel.currentVersion])),
  );
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [availableRelease, setAvailableRelease] = useState<ReleaseNote | null>(null);
  const deferredRestart = useRef(false);

  const selectedChannel = useMemo(() => {
    return channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];
  }, [channels, selectedChannelId]);

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setAvailableRelease(null);
    deferredRestart.current = false;
  }, [selectedChannelId]);

  useEffect(() => {
    const handleOnline = () => {
      if (deferredRestart.current) {
        setStatus('restart');
        setMessage('Connection restored. Ready to restart.');
        deferredRestart.current = false;
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const installedVersion = selectedChannel
    ? installedVersions[selectedChannel.id]
    : undefined;

  const checkForUpdates = useCallback(async () => {
    if (!selectedChannel) return;
    setStatus('checking');
    setMessage(`Checking ${selectedChannel.label} updates…`);
    await delay(200);
    const [latest] = selectedChannel.releases;
    if (!latest) {
      setStatus('idle');
      setMessage('No releases published for this channel yet.');
      setAvailableRelease(null);
      return;
    }

    if (installedVersion && installedVersion === latest.version) {
      setStatus('idle');
      setMessage(`Already on the latest ${selectedChannel.label} build (${installedVersion}).`);
      setAvailableRelease(null);
      return;
    }

    setAvailableRelease(latest);
    setStatus('ready');
    setMessage(`Update ${latest.version} ready for install.`);
  }, [installedVersion, selectedChannel]);

  const installUpdate = useCallback(async () => {
    if (!availableRelease || !selectedChannel) return;
    setStatus('installing');
    setMessage(`Installing ${availableRelease.version}…`);
    await delay(250);
    setStatus('restart');
    setMessage(`Update ${availableRelease.version} installed. Restart required to finish.`);
  }, [availableRelease, selectedChannel]);

  const completeRestart = useCallback(() => {
    if (!availableRelease || !selectedChannel) return;
    setInstalledVersions((prev) => ({
      ...prev,
      [selectedChannel.id]: availableRelease.version,
    }));
    setStatus('completed');
    setMessage(
      `Restart complete. Running ${availableRelease.version} on the ${selectedChannel.label} channel.`,
    );
    setAvailableRelease(null);
  }, [availableRelease, selectedChannel]);

  const restartNow = useCallback(() => {
    if (!availableRelease || !selectedChannel) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('deferred');
      setMessage('Restart deferred until you are back online.');
      deferredRestart.current = true;
      return;
    }

    completeRestart();
  }, [availableRelease, completeRestart, selectedChannel]);

  if (!selectedChannel) {
    return (
      <div className="p-4 text-white bg-ub-dark">
        <p>No update channels are configured.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-ub-dark text-white p-4 space-y-4" data-testid="update-center">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Update Center</h1>
        <p className="text-sm text-gray-300">
          Choose a release channel, review the changelog, and stage the update before restarting the
          desktop shell.
        </p>
      </header>

      <div role="tablist" aria-label="Release channels" className="flex flex-wrap gap-2">
        {channels.map((channel) => {
          const selected = channel.id === selectedChannel.id;
          return (
            <button
              key={channel.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${channel.id}-panel`}
              id={`${channel.id}-tab`}
              onClick={() => setSelectedChannelId(channel.id)}
              className={`px-3 py-1 rounded border ${
                selected ? 'bg-ub-orange text-black border-ub-orange' : 'bg-gray-800 border-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-ubt-blue`}
            >
              {channel.label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`${selectedChannel.id}-panel`}
        aria-labelledby={`${selectedChannel.id}-tab`}
        className="space-y-3 bg-gray-900/60 p-4 rounded border border-gray-700"
      >
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{selectedChannel.label} channel</h2>
          <p className="text-sm text-gray-300">{selectedChannel.description}</p>
          <p className="text-xs text-gray-400" data-testid="installed-version">
            Installed build: {installedVersion}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={checkForUpdates}
              className="px-3 py-1 rounded bg-ubt-blue text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              Check for updates
            </button>
            {status === 'ready' && (
              <button
                type="button"
                onClick={installUpdate}
                className="px-3 py-1 rounded bg-ub-green text-black focus:outline-none focus:ring-2 focus:ring-ubt-blue"
              >
                Install update
              </button>
            )}
            {(status === 'restart' || status === 'deferred') && (
              <button
                type="button"
                onClick={restartNow}
                className="px-3 py-1 rounded bg-ub-orange text-black focus:outline-none focus:ring-2 focus:ring-ubt-blue"
              >
                Restart now
              </button>
            )}
          </div>
          {message && (
            <p role="status" aria-live="polite" className="text-sm" data-testid="update-status">
              {message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Changelog</h3>
          <ol
            className="space-y-3"
            aria-label={`${selectedChannel.label} changelog`}
            data-testid="changelog-list"
          >
            {selectedChannel.releases.map((release) => (
              <li key={release.version} className="bg-gray-800/80 p-3 rounded border border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Version {release.version}</span>
                  <span className="text-gray-400">{release.date}</span>
                </div>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  {release.highlights.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
