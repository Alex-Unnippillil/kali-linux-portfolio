'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  bluetoothDevices,
  discoveryTimeline,
  type DeviceFixture,
} from './fixtures';

const formatClockTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));

const formatRelativeTime = (iso: string) => {
  const eventTime = new Date(iso).getTime();
  const diffSeconds = Math.floor((Date.now() - eventTime) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return `${abs}s ago`;
  const minutes = Math.floor(abs / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const describeSignal = (rssi: number) => {
  if (rssi >= -55) return 'Excellent';
  if (rssi >= -65) return 'Strong';
  if (rssi >= -75) return 'Moderate';
  return 'Weak';
};

const useOfflineStatus = () => {
  const [offline, setOffline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return !navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    };

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return offline;
};

const DeviceSparkline: React.FC<{ samples: number[] }> = ({ samples }) => {
  const gradientId = `sparkline-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = Math.max(160, (samples.length - 1) * 26);
  const height = 70;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = Math.max(1, max - min);
  const path = samples
    .map((sample, index) => {
      const x = (index / Math.max(1, samples.length - 1)) * width;
      const y = height - ((sample - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  return (
    <svg
      role="img"
      aria-label="Signal strength sparkline in dBm"
      className="w-full"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>Signal strength sparkline (dBm)</title>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(56, 189, 248, 0.65)" />
          <stop offset="100%" stopColor="rgba(14, 116, 144, 0.1)" />
        </linearGradient>
      </defs>
      <path d={`${path} L${width} ${height} L0 ${height} Z`} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke="rgb(125 211 252)" strokeWidth={3} />
    </svg>
  );
};

type FilterOption = { label: string; value: string };

const FilterChips: React.FC<{
  label: string;
  options: FilterOption[];
  activeValue: string;
  onChange: (value: string) => void;
}> = ({ label, options, activeValue, onChange }) => (
  <div role="group" aria-label={label} className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === activeValue;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`rounded-full border px-4 py-1.5 text-sm transition focus:outline-none focus-visible:ring focus-visible:ring-sky-400/70 ${
              isActive
                ? 'border-sky-400/80 bg-sky-500/20 text-sky-100 shadow'
                : 'border-slate-600/70 bg-slate-900/70 text-slate-300 hover:border-slate-400/80'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

const DeviceCard: React.FC<{
  device: DeviceFixture;
  labMode: boolean;
  onSelectHistory: (device: DeviceFixture) => void;
}> = ({ device, labMode, onSelectHistory }) => {
  const averageRssi = Math.round(
    device.rssiSamples.reduce((sum, value) => sum + value, 0) /
      Math.max(1, device.rssiSamples.length),
  );
  const latestRssi = device.rssiSamples[device.rssiSamples.length - 1];
  const signalDescriptor = describeSignal(latestRssi);

  return (
    <article
      className="flex flex-col rounded-2xl border border-slate-700/70 bg-slate-950/70 p-6 shadow-xl transition hover:border-sky-500/40 hover:shadow-sky-900/30"
      aria-labelledby={`${device.id}-heading`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-4xl">
            {device.icon}
          </span>
          <div>
            <h3
              id={`${device.id}-heading`}
              className="text-xl font-semibold tracking-tight text-sky-50"
            >
              {device.name}
            </h3>
            <p className="text-sm text-slate-300">{device.vendor}</p>
          </div>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p className="font-semibold text-sky-100">{device.status}</p>
          <p>
            Last seen <time dateTime={device.lastSeen}>{formatRelativeTime(device.lastSeen)}</time>
          </p>
          {device.labOnly && !labMode ? (
            <p className="mt-1 inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
              Lab mode required
            </p>
          ) : null}
        </div>
      </header>

      <dl className="mt-6 grid gap-4 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-400">MAC address</dt>
          <dd className="font-mono text-slate-100">{device.address}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Firmware</dt>
          <dd>{device.firmware}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Battery</dt>
          <dd>{device.battery}%</dd>
        </div>
        <div>
          <dt className="text-slate-400">Advertising</dt>
          <dd>{device.advertisement.intervalMs} ms @ {device.advertisement.channels.join(', ')}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <DeviceSparkline samples={device.rssiSamples} />
        <p className="mt-2 text-xs text-slate-400">
          Avg {averageRssi} dBm • Latest {latestRssi} dBm ({signalDescriptor})
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {device.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-600/60 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Services
          </h4>
          <ul className="mt-2 space-y-1">
            {device.services.map((service) => (
              <li key={service} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notes
          </h4>
          <p className="mt-2 text-slate-300">{device.notes}</p>
        </div>
      </div>

      {labMode && device.labInsights?.length ? (
        <div className="mt-6 rounded-xl border border-sky-500/40 bg-sky-900/20 p-4">
          <h4 className="text-sm font-semibold text-sky-100">Lab insights</h4>
          <dl className="mt-3 grid gap-3 text-sm text-sky-50 sm:grid-cols-2">
            {device.labInsights.map((insight) => (
              <div key={`${device.id}-${insight.title}`}>
                <dt className="text-xs uppercase tracking-wide text-sky-200">
                  {insight.title}
                </dt>
                <dd className="mt-1 text-base font-semibold">{insight.value}</dd>
                <p className="mt-1 text-xs text-sky-100/80">{insight.description}</p>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onSelectHistory(device)}
          className="rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/20 focus:outline-none focus-visible:ring focus-visible:ring-sky-400/70"
        >
          View connection history
        </button>
      </div>
    </article>
  );
};

const DeviceHistoryModal: React.FC<{
  device: DeviceFixture;
  onClose: () => void;
}> = ({ device, onClose }) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const headingId = `${device.id}-history-title`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-sky-50">
              {device.name} connection history
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Replayed from bundled lab fixtures; no live radios are touched.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600/70 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring focus-visible:ring-sky-400/70"
          >
            Close
          </button>
        </div>

        <ol className="mt-6 space-y-4">
          {device.connectionHistory.map((entry) => (
            <li
              key={`${device.id}-${entry.timestamp}`}
              className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-sky-100">{entry.summary}</h3>
                <time
                  className="text-xs uppercase tracking-wide text-slate-400"
                  dateTime={entry.timestamp}
                >
                  {formatDateTime(entry.timestamp)}
                </time>
              </div>
              <p className="mt-2 text-sm text-slate-300">{entry.details}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                Event code: {entry.action}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const BluetoothLabApp: React.FC = () => {
  const [labMode, setLabMode] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState<DeviceFixture | null>(null);
  const [timelineStep, setTimelineStep] = useState(() =>
    discoveryTimeline.length ? 1 : 0,
  );
  const offline = useOfflineStatus();

  const typeOptions = useMemo<FilterOption[]>(() => {
    const unique = Array.from(new Set(bluetoothDevices.map((device) => device.type)));
    return [
      { label: 'All types', value: 'all' },
      ...unique.map((type) => ({ label: type, value: type })),
    ];
  }, []);

  const statusOptions = useMemo<FilterOption[]>(() => {
    const unique = Array.from(new Set(bluetoothDevices.map((device) => device.status)));
    return [
      { label: 'All statuses', value: 'all' },
      ...unique.map((status) => ({ label: status, value: status })),
    ];
  }, []);

  const labLockedCount = useMemo(
    () => bluetoothDevices.filter((device) => device.labOnly).length,
    [],
  );

  const filteredDevices = useMemo(() => {
    return bluetoothDevices.filter((device) => {
      if (!labMode && device.labOnly) {
        return false;
      }
      const typeMatch = selectedType === 'all' || device.type === selectedType;
      const statusMatch =
        selectedStatus === 'all' || device.status === selectedStatus;
      return typeMatch && statusMatch;
    });
  }, [labMode, selectedStatus, selectedType]);

  useEffect(() => {
    if (!discoveryTimeline.length) return undefined;
    const id = window.setInterval(() => {
      setTimelineStep((step) => {
        if (!discoveryTimeline.length) {
          return 0;
        }
        const next = step + 1;
        return next > discoveryTimeline.length ? 1 : next;
      });
    }, 2200);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const visibleTimeline = discoveryTimeline.slice(0, timelineStep);
  const timelineProgress = discoveryTimeline.length
    ? Math.min(100, (timelineStep / discoveryTimeline.length) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-sky-50 sm:text-4xl">
          Bluetooth Recon Dashboard (Simulated)
        </h1>
        <p className="max-w-3xl text-base text-slate-300">
          Explore a curated Bluetooth Low Energy lab complete with replayed
          discovery logs, signal analytics, and connection history. Every panel
          runs on offline fixtures so you can inspect workflows without enabling
          live radios.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside
          className="rounded-2xl border border-amber-500/50 bg-amber-900/20 p-5 text-sm text-amber-100 shadow"
          role="note"
          aria-label="Simulation notice"
        >
          <p className="text-base font-semibold uppercase tracking-wide text-amber-100">
            Simulation notice
          </p>
          <p className="mt-2">
            Device telemetry, signal sweeps, and history logs originate from
            bundled JSON fixtures (<code className="font-mono">fixtures.ts</code>)
            and can operate fully offline.
          </p>
          <p className="mt-2">
            Use Lab Mode to unlock deeper packet insights—radio transmissions
            remain disabled regardless of toggle state.
          </p>
        </aside>

        <aside
          className={`rounded-2xl border p-5 text-sm shadow transition ${
            offline
              ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-100'
              : 'border-slate-600/70 bg-slate-900/70 text-slate-200'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-base font-semibold uppercase tracking-wide">
            {offline ? 'Offline fixtures active' : 'Online preview'}
          </p>
          <p className="mt-2">
            {offline
              ? 'Service worker cached assets are serving the experience; network calls are suppressed.'
              : 'A connection is available, but Bluetooth actions still use canned datasets.'}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            {bluetoothDevices.length} devices staged •{' '}
            {labLockedCount} gated behind Lab Mode
          </p>
        </aside>

        <aside className="rounded-2xl border border-sky-500/40 bg-sky-900/20 p-5 text-sm text-sky-100 shadow">
          <p className="text-base font-semibold uppercase tracking-wide">
            Scanner status
          </p>
          <p className="mt-2">
            Timeline replays {discoveryTimeline.length} discoveries on a loop to
            illustrate staged environment sweeps. Progress resets automatically
            for continuous demos.
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-700 ease-out"
              style={{ width: `${timelineProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-sky-200">
            Showing {visibleTimeline.length} of {discoveryTimeline.length} recent
            captures
          </p>
        </aside>
      </div>

      <section
        aria-labelledby="lab-controls-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-6 shadow-xl"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2
              id="lab-controls-heading"
              className="text-2xl font-semibold tracking-tight text-sky-50"
            >
              Lab controls
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Toggle Lab Mode to surface advanced analytics such as decoded
              descriptors, packet counters, and firmware metadata. Filters update
              in real time so you can focus on the device class under review.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={labMode}
            onClick={() => setLabMode((value) => !value)}
            className={`inline-flex items-center gap-3 rounded-full border px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring focus-visible:ring-sky-400/70 ${
              labMode
                ? 'border-sky-400 bg-sky-500/20 text-sky-100 shadow'
                : 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-slate-400'
            }`}
          >
            <span
              className={`flex h-5 w-10 items-center rounded-full transition ${
                labMode ? 'justify-end bg-sky-500/60' : 'justify-start bg-slate-700'
              }`}
            >
              <span className="m-0.5 h-4 w-4 rounded-full bg-white" />
            </span>
            {labMode ? 'Lab mode enabled' : 'Enable lab mode'}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          {labMode
            ? 'Advanced metrics unlocked. Remember: everything still executes on offline fixtures.'
            : `Enable Lab Mode to reveal ${labLockedCount} quarantined dataset${
                labLockedCount === 1 ? '' : 's'
              } with deeper diagnostics.`}
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <FilterChips
            label="Filter by type"
            options={typeOptions}
            activeValue={selectedType}
            onChange={setSelectedType}
          />
          <FilterChips
            label="Filter by status"
            options={statusOptions}
            activeValue={selectedStatus}
            onChange={setSelectedStatus}
          />
        </div>
      </section>

      <section
        aria-labelledby="timeline-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-6 shadow-xl"
      >
        <h2
          id="timeline-heading"
          className="text-2xl font-semibold tracking-tight text-sky-50"
        >
          Animated discovery timeline
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          The timeline loops through the staged discovery events to simulate live
          scanning without ever touching the host radio. Each step exposes the
          canned metadata bundled with the app.
        </p>
        <ol className="mt-6 space-y-4" aria-live="polite">
          {visibleTimeline.map((event, index) => (
            <li key={event.id} className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-sky-500/50 bg-sky-500/10 text-sm font-semibold text-sky-100">
                <span aria-hidden="true">{index + 1}</span>
                <span className="sr-only">Discovery {index + 1}</span>
              </div>
              <div className="flex-1 rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-sky-100">{event.deviceName}</p>
                  <time
                    className="text-xs uppercase tracking-wide text-slate-400"
                    dateTime={event.discoveredAt}
                  >
                    {formatClockTime(event.discoveredAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm text-slate-300">{event.note}</p>
                <p className="mt-2 text-xs text-slate-400">Signal {event.rssi} dBm</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="devices-heading"
        className="space-y-6"
      >
        <h2
          id="devices-heading"
          className="text-2xl font-semibold tracking-tight text-sky-50"
        >
          Device inventory
        </h2>
        {filteredDevices.length ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                labMode={labMode}
                onSelectHistory={setSelectedDevice}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-6 text-sm text-slate-300">
            No devices match the current filters. Try toggling Lab Mode or
            clearing one of the chip groups above.
          </p>
        )}
      </section>

      <section
        aria-labelledby="tutorials-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-6 shadow-xl"
      >
        <h2
          id="tutorials-heading"
          className="text-2xl font-semibold tracking-tight text-sky-50"
        >
          Tutorials: working with simulated datasets
        </h2>
        <div className="mt-4 space-y-3">
          <details className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-sky-100">
              1. Replay discovery sweeps
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Watch the discovery timeline increment as events play back.</li>
              <li>
                Toggle Lab Mode to expose extra annotations sourced from the
                fixtures—no radios are ever toggled.
              </li>
              <li>
                Open a device history modal to walk through canned connection
                logs and anomaly markers.
              </li>
            </ol>
          </details>
          <details className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-sky-100">
              2. Inspect lab-only beacons safely
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>
                Enable Lab Mode and re-run the filters to reveal quarantined
                fixtures like the LumenDesk beacon.
              </li>
              <li>
                Compare advertised channels, firmware hashes, and mesh metrics
                against the expected manifest.
              </li>
              <li>
                Document findings without ever transmitting packets by exporting
                screenshots or notes directly from this dashboard.
              </li>
            </ol>
          </details>
        </div>
      </section>

      {selectedDevice ? (
        <DeviceHistoryModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      ) : null}
    </div>
  );
};

export default BluetoothLabApp;
