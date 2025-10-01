import React, { FormEvent, useMemo, useState } from 'react';
import NetworkPanel from './NetworkPanel';
import {
  CUSTOM_PROFILE_ID,
  DEFAULT_CUSTOM_SETTINGS,
  DEFAULT_PROFILE,
  NETWORK_PRESETS,
  CustomNetworkSettings,
  NetworkProfile,
  RequestTimelineEntry,
  computeTimeline,
  createRequestsForUrl,
  describeProfile,
} from './network';
import { FirefoxSimulationView, SIMULATIONS, toSimulationKey } from './simulations';

const DEFAULT_URL = 'https://www.kali.org/docs/';
const STORAGE_KEY = 'firefox:last-url';
const START_URL_KEY = 'firefox:start-url';

const BOOKMARKS = [
  { label: 'OffSec', url: 'https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox' },
  { label: 'Kali Linux', url: 'https://www.kali.org/' },
  { label: 'Kali Tools', url: 'https://www.kali.org/tools/' },
  { label: 'Kali Docs', url: 'https://www.kali.org/docs/' },
  { label: 'Kali Forums', url: 'https://forums.kali.org/' },
  { label: 'Kali NetHunter', url: 'https://www.kali.org/get-kali/#kali-platforms' },
  { label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
  { label: 'GoogleHackingDB', url: 'https://www.exploit-db.com/google-hacking-database' },
];

const normaliseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_URL;
  }
  try {
    const hasProtocol = /^(https?:)?\/\//i.test(trimmed);
    if (hasProtocol) {
      const url = new URL(trimmed, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return DEFAULT_URL;
    }
    const candidate = new URL(`https://${trimmed}`);
    return candidate.toString();
  } catch {
    return DEFAULT_URL;
  }
};

const getSimulation = (value: string) => {
  const key = toSimulationKey(value);
  if (!key) {
    return null;
  }
  return SIMULATIONS[key] ?? null;
};

const Firefox: React.FC = () => {
  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_URL;
    }
    try {
      const start = sessionStorage.getItem(START_URL_KEY);
      if (start) {
        sessionStorage.removeItem(START_URL_KEY);
        const url = normaliseUrl(start);
        localStorage.setItem(STORAGE_KEY, url);
        return url;
      }
      const last = localStorage.getItem(STORAGE_KEY);
      return last ? normaliseUrl(last) : DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  }, []);

  const [address, setAddress] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [simulation, setSimulation] = useState(() => getSimulation(initialUrl));

  const requests = useMemo(() => createRequestsForUrl(address), [address]);
  const [networkProfile, setNetworkProfile] = useState<NetworkProfile>(DEFAULT_PROFILE);
  const [customSettings, setCustomSettings] = useState<CustomNetworkSettings>(DEFAULT_CUSTOM_SETTINGS);
  const timeline = useMemo<RequestTimelineEntry[]>(
    () => computeTimeline(networkProfile, requests),
    [networkProfile, requests],
  );

  const updateAddress = (value: string) => {
    const url = normaliseUrl(value);
    setAddress(url);
    setInputValue(url);
    setSimulation(getSimulation(url));
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      /* ignore persistence errors */
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAddress(inputValue);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = NETWORK_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    setNetworkProfile({ ...preset, offline: false, custom: false });
    setCustomSettings({
      latency: preset.latency,
      downloadKbps: preset.downloadKbps,
      uploadKbps: preset.uploadKbps,
    });
  };

  const handleApplyCustom = (settings: CustomNetworkSettings) => {
    setCustomSettings(settings);
    setNetworkProfile({
      id: CUSTOM_PROFILE_ID,
      label: 'Custom',
      latency: settings.latency,
      downloadKbps: settings.downloadKbps,
      uploadKbps: settings.uploadKbps,
      offline: false,
      custom: true,
    });
  };

  const handleToggleOffline = (offline: boolean) => {
    setNetworkProfile((current) => ({ ...current, offline }));
  };

  const handleResetNetwork = () => {
    setNetworkProfile(DEFAULT_PROFILE);
    setCustomSettings(DEFAULT_CUSTOM_SETTINGS);
  };

  const profileLabel = describeProfile(networkProfile);

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-b border-gray-700 bg-gray-900 px-3 py-2"
      >
        <label htmlFor="firefox-address" className="sr-only">
          Address
        </label>
          <input
            id="firefox-address"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Enter a URL"
            aria-label="Firefox address bar"
            className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Go
        </button>
      </form>
      <nav className="flex flex-wrap gap-1 border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs">
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.url}
            type="button"
            onClick={() => updateAddress(bookmark.url)}
            className="rounded bg-gray-800 px-3 py-1 font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {bookmark.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center justify-between border-b border-gray-900 bg-gray-950/80 px-3 py-2 text-xs text-gray-300">
        <span className="font-medium text-gray-100">Active network profile</span>
        <span className={networkProfile.offline ? 'text-red-300' : 'text-gray-200'}>{profileLabel}</span>
      </div>
      <div className="relative flex-1 bg-black">
        {simulation ? (
          <FirefoxSimulationView simulation={simulation} />
        ) : (
          <iframe
            key={address}
            title="Firefox"
            src={address}
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        )}
        {networkProfile.offline ? (
          <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <div className="rounded-full border border-red-500/60 bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
              Offline mode
            </div>
            <p className="mt-3 max-w-md text-sm text-gray-200">
              Requests are blocked by the simulated network profile. Disable offline mode or reset throttling to resume loading c
ontent.
            </p>
          </div>
        ) : null}
      </div>
      <NetworkPanel
        activeProfile={networkProfile}
        presets={NETWORK_PRESETS}
        customSettings={customSettings}
        timeline={timeline}
        onSelectPreset={handleSelectPreset}
        onApplyCustom={handleApplyCustom}
        onToggleOffline={handleToggleOffline}
        onReset={handleResetNetwork}
      />
    </div>
  );
};

export const displayFirefox = () => <Firefox />;

export default Firefox;
