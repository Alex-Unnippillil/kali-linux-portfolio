'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { WindowMainScreen, WindowTopBar } from '@/components/base/window';
import updateData from '@/data/updates/sample.json';

type UpdateItem = {
  id: string;
  name: string;
  version: string;
  size: string;
  severity: string;
  releaseDate: string;
  requiresRestart: boolean;
  summary: string;
};

type Channel = {
  id: string;
  name: string;
  track: string;
  status: string;
  recommended: boolean;
  lastSynced: string;
  description: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  date: string;
  result: string;
  notes: string;
};

type Settings = {
  autoCheck: boolean;
  autoDownload: boolean;
  downloadOverMetered: boolean;
  notifyOnCompletion: boolean;
  maintenanceWindow: string;
};

type UpdateDataset = {
  lastChecked: string;
  available: UpdateItem[];
  channels: Channel[];
  history: HistoryEntry[];
  settings: Settings;
};

const dataset = updateData as UpdateDataset;

const severityTone: Record<string, string> = {
  security: 'bg-red-500/20 text-red-200',
  recommended: 'bg-ubt-green/20 text-ubt-green',
  feature: 'bg-ubt-blue/20 text-ubt-blue',
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return date.toLocaleString();
  }
}

function formatResultLabel(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resultTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('success')) {
    return 'text-ubt-green';
  }
  if (normalized.includes('fail')) {
    return 'text-ub-orange';
  }
  if (normalized.includes('reboot')) {
    return 'text-ub-orange';
  }
  return 'text-white/70';
}

type PanelProps = {
  title: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

function Panel({ title, actions, footer, children }: PanelProps) {
  return (
    <div className="flex min-h-[16rem] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg backdrop-blur">
      <WindowTopBar title={title} grabbed={false} />
      <WindowMainScreen
        title={title}
        screen={() => (
          <div className="flex h-full flex-col gap-4 p-4 text-sm text-white">
            {actions && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
                {actions}
              </div>
            )}
            <div className="flex-1 overflow-y-auto pr-1">{children}</div>
            {footer && <div className="text-xs text-white/60">{footer}</div>}
          </div>
        )}
      />
    </div>
  );
}

type SettingToggleProps = {
  label: string;
  active: boolean;
  description?: string;
};

function SettingToggle({ label, active, description }: SettingToggleProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p>{label}</p>
          {description && <p className="text-xs text-white/60">{description}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{active ? 'On' : 'Off'}</span>
          <span
            role="switch"
            aria-checked={active}
            aria-label={label}
            className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full border border-white/20 transition ${
              active ? 'bg-ubt-blue/80' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                active ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

function UpdateCenter() {
  const availableCount = dataset.available.length;
  const [selectedChannelId, setSelectedChannelId] = useState(() => {
    return dataset.channels.find((channel) => channel.status === 'active')?.id ?? dataset.channels[0]?.id ?? '';
  });
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Using sample data for UI development.');

  const selectedChannel = useMemo(
    () => dataset.channels.find((channel) => channel.id === selectedChannelId),
    [selectedChannelId],
  );

  useEffect(() => {
    if (!checking) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setChecking(false);
      setStatusMessage('No new updates detected in the demo dataset.');
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [checking]);

  const startCheck = () => {
    if (checking) {
      return;
    }
    setStatusMessage('Checking for updates...');
    setChecking(true);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden text-white">
      <header className="rounded-xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Update Center</h1>
            <p className="text-xs text-white/70">
              Prototype dashboard that ships with mocked package metadata so the UI can ship before the API.
            </p>
          </div>
          <dl className="text-xs text-white/60">
            <dt className="sr-only">Last checked</dt>
            <dd>Last checked {formatDateTime(dataset.lastChecked)}</dd>
          </dl>
        </div>
      </header>
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Available updates"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <span>
                {availableCount} update{availableCount === 1 ? '' : 's'} ready
              </span>
              <button
                type="button"
                onClick={startCheck}
                disabled={checking}
                className="rounded-md bg-ubt-blue px-3 py-1 text-xs font-semibold text-black shadow disabled:opacity-60"
              >
                {checking ? 'Checking…' : 'Check for updates'}
              </button>
            </div>
          }
          footer={<p className="text-xs text-white/60" aria-live="polite">{statusMessage}</p>}
        >
          <ul className="space-y-3">
            {dataset.available.map((update) => (
              <li key={update.id} className="rounded-lg border border-white/10 bg-black/40 p-3 shadow-inner">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{update.name}</p>
                    <p className="text-xs text-white/70">{update.summary}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border border-white/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${
                      severityTone[update.severity] ?? 'bg-white/10 text-white/70'
                    }`}
                  >
                    {formatResultLabel(update.severity)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
                  <span>Version {update.version}</span>
                  <span>{update.size}</span>
                  <span>Released {formatDateTime(update.releaseDate)}</span>
                  {update.requiresRestart && <span className="font-semibold text-ub-orange">Restart required</span>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Channel selection"
          actions={
            selectedChannel ? (
              <span>
                Active channel: <strong className="font-semibold text-white">{selectedChannel.name}</strong>
              </span>
            ) : (
              <span>No channels configured</span>
            )
          }
        >
          <div className="space-y-3">
            {dataset.channels.map((channel) => {
              const isSelected = channel.id === selectedChannelId;
              return (
                <label
                  key={channel.id}
                  className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-ubt-blue/70 ${
                    isSelected ? 'border-ubt-blue/60 bg-ub-drk-abrgn/70' : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="update-channel"
                      value={channel.id}
                      checked={isSelected}
                      onChange={() => setSelectedChannelId(channel.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{channel.name}</span>
                        <span className="text-xs uppercase tracking-wide text-white/60">{channel.track}</span>
                        {channel.recommended && (
                          <span className="rounded-full bg-ubt-green px-2 text-[0.65rem] font-semibold text-black">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/70">{channel.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-7 text-[0.7rem] text-white/60">
                    <span>
                      Status: <span className="capitalize text-white">{channel.status}</span>
                    </span>
                    <span>Last synced {formatDateTime(channel.lastSynced)}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </Panel>
        <Panel title="History">
          <ul className="space-y-3">
            {dataset.history.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{entry.title}</p>
                    <p className="text-xs text-white/70">{entry.notes}</p>
                  </div>
                  <span className={`text-[0.7rem] font-semibold uppercase tracking-wide ${resultTone(entry.result)}`}>
                    {formatResultLabel(entry.result)}
                  </span>
                </div>
                <div className="mt-2 text-xs text-white/60">{formatDateTime(entry.date)}</div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Settings"
          footer={
            <span className="text-xs text-white/60">
              Maintenance window: {dataset.settings.maintenanceWindow}
            </span>
          }
        >
          <div className="space-y-3">
            <SettingToggle
              label="Automatically check for updates"
              active={dataset.settings.autoCheck}
              description="Runs a daily metadata sync in the background."
            />
            <SettingToggle
              label="Download updates in the background"
              active={dataset.settings.autoDownload}
              description="Pre-fetch packages as soon as they are available."
            />
            <SettingToggle
              label="Allow downloads on metered connections"
              active={dataset.settings.downloadOverMetered}
              description="Useful when tethering or in bandwidth constrained labs."
            />
            <SettingToggle
              label="Notify when maintenance completes"
              active={dataset.settings.notifyOnCompletion}
              description="Send a desktop alert after automation finishes."
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default UpdateCenter;
