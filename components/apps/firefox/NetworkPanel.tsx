import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  CustomNetworkSettings,
  NetworkPreset,
  NetworkProfile,
  RequestTimelineEntry,
  describeProfile,
  formatDuration,
  formatLatency,
} from './network';

type NetworkPanelProps = {
  activeProfile: NetworkProfile;
  presets: NetworkPreset[];
  customSettings: CustomNetworkSettings;
  timeline: RequestTimelineEntry[];
  onSelectPreset: (presetId: string) => void;
  onApplyCustom: (settings: CustomNetworkSettings) => void;
  onToggleOffline: (offline: boolean) => void;
  onReset: () => void;
};

type CustomFormState = {
  latency: string;
  download: string;
  upload: string;
};

const toInputState = (settings: CustomNetworkSettings): CustomFormState => ({
  latency: settings.latency.toString(),
  download: settings.downloadKbps.toString(),
  upload: settings.uploadKbps.toString(),
});

const parsePositiveNumber = (value: string, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
};

const Timeline: React.FC<{ timeline: RequestTimelineEntry[] }> = ({ timeline }) => {
  const totals = useMemo(() => {
    const maxEnd = timeline.reduce((acc, entry) => Math.max(acc, entry.start + entry.total), 0);
    const transferred = timeline.reduce((acc, entry) => (entry.status === 'success' ? acc + entry.sizeKB : acc), 0);
    const blocked = timeline.filter((entry) => entry.status === 'blocked').length;
    return { maxEnd, transferred, blocked };
  }, [timeline]);

  const maxWidth = totals.maxEnd > 0 ? totals.maxEnd : 1;

  return (
    <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <div>
          Total load time: <span className="font-medium text-white">{formatDuration(totals.maxEnd)}</span>
        </div>
        <div>
          Transferred: <span className="font-medium text-white">{Math.round(totals.transferred)} KB</span>
        </div>
        <div>
          {totals.blocked > 0 ? (
            <span className="font-medium text-red-400">{totals.blocked} request(s) blocked</span>
          ) : (
            <span className="text-gray-400">All requests succeeded</span>
          )}
        </div>
      </div>
      <ul className="mt-4 space-y-3 text-xs text-gray-300" aria-label="Simulated request timeline">
        {timeline.map((entry) => {
          const width = Math.max(6, Math.round((entry.total / maxWidth) * 100));
          return (
            <li key={entry.id} className="rounded-md border border-gray-800 bg-gray-900/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                <span className="font-semibold text-gray-100">
                  {entry.method} {entry.label}
                </span>
                <span>{entry.type}</span>
              </div>
              <div className="mt-2 h-2 rounded bg-gray-800">
                {entry.status === 'blocked' ? (
                  <div className="h-2 rounded bg-red-500" style={{ width: '100%' }} />
                ) : (
                  <div className="h-2 rounded bg-blue-500" style={{ width: `${width}%` }} />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                <span>{Math.round(entry.sizeKB)} KB</span>
                <span>{formatLatency(entry.latency)}</span>
                <span>
                  {entry.status === 'blocked'
                    ? 'offline'
                    : `${formatDuration(entry.transfer)} transfer (${formatDuration(entry.total)} total)`}
                </span>
                {entry.start > 0 && entry.status !== 'blocked' ? (
                  <span>start +{formatDuration(entry.start)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const OfflineToggle: React.FC<{ offline: boolean; onToggle: (value: boolean) => void }> = ({ offline, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(!offline)}
    className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
      offline
        ? 'border-red-500/60 bg-red-500/20 text-red-200 hover:bg-red-500/30'
        : 'border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
    }`}
    aria-pressed={offline}
  >
    <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden="true" />
    {offline ? 'Offline mode enabled' : 'Go offline'}
  </button>
);

const NetworkPanel: React.FC<NetworkPanelProps> = ({
  activeProfile,
  presets,
  customSettings,
  timeline,
  onSelectPreset,
  onApplyCustom,
  onToggleOffline,
  onReset,
}) => {
  const [form, setForm] = useState<CustomFormState>(() => toInputState(customSettings));

  useEffect(() => {
    setForm(toInputState(customSettings));
  }, [customSettings]);

  const idPrefix = useId();
  const latencyId = `${idPrefix}-latency`;
  const downloadId = `${idPrefix}-download`;
  const uploadId = `${idPrefix}-upload`;

  const handleChange = (field: keyof CustomFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApplyCustom({
      latency: parsePositiveNumber(form.latency, customSettings.latency),
      downloadKbps: parsePositiveNumber(form.download, customSettings.downloadKbps),
      uploadKbps: parsePositiveNumber(form.upload, customSettings.uploadKbps),
    });
  };

  return (
    <section className="border-t border-gray-800 bg-gray-900/90 px-4 py-5 text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Network throttling</h2>
          <p className="text-xs text-gray-300">{describeProfile(activeProfile)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OfflineToggle offline={Boolean(activeProfile.offline)} onToggle={onToggleOffline} />
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Presets</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const active = !activeProfile.custom && !activeProfile.offline && activeProfile.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`rounded border px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    active ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700'
                  }`}
                  aria-pressed={active}
                >
                  <div className="text-sm font-semibold">{preset.label}</div>
                  <div className="text-[11px] text-gray-400">{preset.description}</div>
                </button>
              );
            })}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Custom throttling</h3>
          <div className="mt-3 grid gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label htmlFor={latencyId} className="text-[11px] uppercase tracking-wide text-gray-400">
                Latency (ms)
              </label>
              <input
                id={latencyId}
                type="number"
                min={1}
                value={form.latency}
                onChange={handleChange('latency')}
                aria-label="Custom latency in milliseconds"
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={downloadId} className="text-[11px] uppercase tracking-wide text-gray-400">
                Download (Kbps)
              </label>
              <input
                id={downloadId}
                type="number"
                min={1}
                value={form.download}
                onChange={handleChange('download')}
                aria-label="Custom download bandwidth in kilobits per second"
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={uploadId} className="text-[11px] uppercase tracking-wide text-gray-400">
                Upload (Kbps)
              </label>
              <input
                id={uploadId}
                type="number"
                min={1}
                value={form.upload}
                onChange={handleChange('upload')}
                aria-label="Custom upload bandwidth in kilobits per second"
                className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded bg-blue-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Apply custom profile
          </button>
        </form>
      </div>

      <Timeline timeline={timeline} />
    </section>
  );
};

export default NetworkPanel;
