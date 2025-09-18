'use client';

import React, { useEffect, useMemo, useState, useId } from 'react';
import {
  PortForwardDefinition,
  ForwardDirection,
  PortForwardInput,
  ensureActiveForwards,
  getForwardStatus,
  subscribeListenerRegistry,
  useSshProfile,
  deactivateProfile,
} from '../state/profiles';

interface PortForwardPanelProps {
  profileId: string;
}

const directionLabel = (direction: ForwardDirection) =>
  direction === 'local' ? 'Local Forward' : 'Remote Forward';

const directionFlow = (forward: PortForwardDefinition) =>
  forward.direction === 'local'
    ? `localhost:${forward.sourcePort} → ${forward.destinationHost}:${forward.destinationPort}`
    : `${forward.destinationHost}:${forward.destinationPort} → localhost:${forward.sourcePort}`;

const statusChip = (status: 'listening' | 'stopped') => ({
  label: status === 'listening' ? 'Listening' : 'Stopped',
  className:
    status === 'listening'
      ? 'bg-green-700 text-green-100 border border-green-500'
      : 'bg-gray-700 text-gray-200 border border-gray-600',
});

const DEFAULT_SOURCE_PORT = '8080';
const DEFAULT_DEST_PORT = '80';
const DEFAULT_HOST = '127.0.0.1';

const PortForwardPanel: React.FC<PortForwardPanelProps> = ({ profileId }) => {
  const { profile, addForward, updateForward, removeForward, setForwardEnabled } = useSshProfile(profileId);
  const [direction, setDirection] = useState<ForwardDirection>('local');
  const [sourcePort, setSourcePort] = useState(DEFAULT_SOURCE_PORT);
  const [destinationHost, setDestinationHost] = useState(DEFAULT_HOST);
  const [destinationPort, setDestinationPort] = useState(DEFAULT_DEST_PORT);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  const formId = useId();
  const sourceId = `${formId}-source-port`;
  const hostId = `${formId}-destination-host`;
  const destPortId = `${formId}-destination-port`;

  useEffect(() => {
    ensureActiveForwards(profileId, profile.forwards);
  }, [profileId, profile.forwards]);

  useEffect(() => {
    const unsubscribe = subscribeListenerRegistry(() => {
      forceUpdate((value) => value + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      deactivateProfile(profileId);
    };
  }, [profileId]);

  const handleAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedSource = Number(sourcePort);
    const parsedDest = Number(destinationPort);
    const trimmedHost = destinationHost.trim();

    if (!Number.isInteger(parsedSource) || parsedSource <= 0) {
      setError('Enter a valid source port.');
      return;
    }
    if (!Number.isInteger(parsedDest) || parsedDest <= 0) {
      setError('Enter a valid destination port.');
      return;
    }
    if (!trimmedHost) {
      setError('Destination host is required.');
      return;
    }

    const payload: PortForwardInput = {
      direction,
      sourcePort: parsedSource,
      destinationHost: trimmedHost,
      destinationPort: parsedDest,
    };
    addForward(payload);

    setSourcePort(DEFAULT_SOURCE_PORT);
    setDestinationPort(DEFAULT_DEST_PORT);
    setDestinationHost(trimmedHost);
  };

  const forwards = useMemo(() => profile.forwards, [profile.forwards]);

  return (
    <section className="mt-6 rounded border border-gray-700 bg-gray-900 p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Port Forwarding</h2>
          <p className="text-sm text-gray-300">
            Define local and remote forwards. This panel simulates SSH listeners and does not open real sockets.
          </p>
        </div>
      </div>
      <form onSubmit={handleAdd} className="mb-4 grid gap-4 md:grid-cols-[auto,1fr,1fr,auto] md:items-end">
        <div className="flex flex-col">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Type</span>
          <button
            type="button"
            onClick={() => setDirection((current) => (current === 'local' ? 'remote' : 'local'))}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white hover:border-gray-400"
            aria-label="Toggle forward direction"
          >
            {direction === 'local' ? 'Local → Remote' : 'Remote → Local'}
          </button>
        </div>
        <label htmlFor={sourceId} className="flex flex-col">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Source port</span>
          <input
            id={sourceId}
            type="number"
            min={1}
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
            value={sourcePort}
            onChange={(event) => setSourcePort(event.target.value)}
          />
        </label>
        <label htmlFor={hostId} className="flex flex-col">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Destination host</span>
          <input
            id={hostId}
            type="text"
            className="rounded border border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
            value={destinationHost}
            onChange={(event) => setDestinationHost(event.target.value)}
          />
        </label>
        <label htmlFor={destPortId} className="flex flex-col">
          <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Destination port</span>
          <div className="flex gap-2">
            <input
              id={destPortId}
              type="number"
              min={1}
              className="w-full rounded border border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none"
              value={destinationPort}
              onChange={(event) => setDestinationPort(event.target.value)}
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add Forward
            </button>
          </div>
        </label>
      </form>
      {error && <p className="mb-4 text-sm text-red-400" role="alert">{error}</p>}
      {forwards.length === 0 ? (
        <p className="text-sm text-gray-400">No forwards defined yet. Add one above to start listening.</p>
      ) : (
        <ul className="space-y-3">
          {forwards.map((forward) => {
            const status = getForwardStatus(forward.id);
            const chip = statusChip(status);
            const nextDirection = forward.direction === 'local' ? 'remote' : 'local';

            return (
              <li
                key={forward.id}
                className="rounded border border-gray-700 bg-gray-800 p-3 text-sm text-white"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <button
                      type="button"
                      onClick={() => updateForward(forward.id, { direction: nextDirection })}
                      className="rounded border border-gray-600 bg-gray-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:border-gray-400"
                      aria-label={`Switch to ${directionLabel(nextDirection)}`}
                    >
                      {directionLabel(forward.direction)}
                    </button>
                    <span className="font-mono text-gray-100">{directionFlow(forward)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${chip.className}`}
                    >
                      {chip.label}
                    </span>
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-300">
                      <input
                        type="checkbox"
                        checked={forward.enabled}
                        onChange={(event) => setForwardEnabled(forward.id, event.target.checked)}
                        className="h-4 w-4 accent-blue-500"
                        aria-label={`Activate forward ${forward.sourcePort} to ${forward.destinationHost}:${forward.destinationPort}`}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => removeForward(forward.id)}
                      className="rounded border border-red-600 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-200 hover:bg-red-600/20"
                      aria-label={`Remove forward ${forward.sourcePort} to ${forward.destinationHost}:${forward.destinationPort}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PortForwardPanel;

