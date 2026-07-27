'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import seedrandom from 'seedrandom';
import modules from '../../../components/apps/metasploit/modules.json';
import usePersistentState from '../../../hooks/usePersistentState';

interface ModuleInfo {
  name: string;
  description?: string;
}

interface SavedSession {
  name: string;
  output: string;
}

const BROWSER_PRESETS = [
  {
    id: 'desktop',
    label: 'Desktop (Windows · Chrome)',
    locale: 'en-US',
    timezone: 'America/New_York',
    colorScheme: 'light' as const,
  },
  {
    id: 'mobile',
    label: 'Android (Chrome Mobile)',
    locale: 'en-US',
    timezone: 'America/Los_Angeles',
    colorScheme: 'dark' as const,
  },
  {
    id: 'tablet',
    label: 'iPadOS (Safari)',
    locale: 'en-GB',
    timezone: 'Europe/London',
    colorScheme: 'light' as const,
  },
] as const;

const FEATURE_FLAGS = [
  { id: 'cookies' as const, label: 'Cookies allowed' },
  { id: 'storage' as const, label: 'Local storage available' },
  { id: 'notifications' as const, label: 'Notifications granted' },
] as const;

type BrowserPresetId = (typeof BROWSER_PRESETS)[number]['id'];
type FeatureId = (typeof FEATURE_FLAGS)[number]['id'];
type FeatureMap = Record<FeatureId, boolean>;

interface EmulatorSettingsSnapshot {
  profile: BrowserPresetId;
  profileLabel: string;
  locale: string;
  timezone: string;
  colorScheme: 'dark' | 'light';
  features: FeatureMap;
}

interface BrowserSnapshot {
  data: Record<string, string>;
  settings: EmulatorSettingsSnapshot;
  timestamp: number;
}

const DATA_LABELS: Record<string, string> = {
  userAgent: 'User agent',
  language: 'Language',
  platform: 'Platform',
  timezone: 'Time zone',
  resolution: 'Screen resolution',
  colorDepth: 'Color depth',
  devicePixelRatio: 'Device pixel ratio',
  colorScheme: 'Color scheme',
  online: 'Online',
  cookiesEnabled: 'Cookies enabled',
  doNotTrack: 'Do Not Track',
  maxTouchPoints: 'Touch points',
};

const defaultFeatures: FeatureMap = FEATURE_FLAGS.reduce((acc, flag) => {
  acc[flag.id] = true;
  return acc;
}, {} as FeatureMap);

const buildSandboxDoc = () => {
  const script = `
    (() => {
      const gather = (settings = {}) => {
        const scr = window.screen || {};
        let timezone = '';
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (err) {
          timezone = '';
        }
        const prefersDark =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches;
        const data = {
          userAgent: navigator.userAgent,
          language: navigator.language || '',
          platform: navigator.platform || '',
          timezone,
          resolution: (scr.width || 0) + 'x' + (scr.height || 0),
          colorDepth: String(scr.colorDepth || ''),
          devicePixelRatio: String(window.devicePixelRatio || 1),
          colorScheme: prefersDark ? 'dark' : 'light',
          online: navigator.onLine ? 'true' : 'false',
          cookiesEnabled: navigator.cookieEnabled ? 'true' : 'false',
          doNotTrack: navigator.doNotTrack || 'unspecified',
          maxTouchPoints:
            typeof navigator.maxTouchPoints === 'number'
              ? String(navigator.maxTouchPoints)
              : '0',
        };
        parent.postMessage({ type: 'emulator-data', data, settings }, '*');
      };
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'collect') {
          gather(event.data.settings || {});
        }
      });
      gather();
    })();
  `;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Sandboxed target</title><style>body{margin:0;background:#111;color:#eee;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;padding:16px;text-align:center;font-size:14px;}code{background:#222;padding:2px 4px;border-radius:4px;color:#ffb86c;}</style></head><body><p><strong>Sandboxed target</strong><br/>Environment data is shared locally via <code>postMessage</code>.</p><script>${script.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
};

const formatLabel = (key: string) =>
  key
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const sanitizeData = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      result[key] = '';
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    } else {
      try {
        result[key] = JSON.stringify(value);
      } catch (err) {
        result[key] = String(value);
      }
    }
  });
  return result;
};

const sanitizeFeatures = (raw: unknown, base: FeatureMap): FeatureMap => {
  const next: FeatureMap = { ...base };
  if (!raw || typeof raw !== 'object') {
    return next;
  }
  FEATURE_FLAGS.forEach((flag) => {
    const value = (raw as Record<string, unknown>)[flag.id];
    if (typeof value === 'boolean') {
      next[flag.id] = value;
    }
  });
  return next;
};

const sanitizeSettings = (
  raw: unknown,
  base: EmulatorSettingsSnapshot,
): EmulatorSettingsSnapshot => {
  const safe: EmulatorSettingsSnapshot = {
    ...base,
    features: { ...base.features },
  };
  if (!raw || typeof raw !== 'object') {
    return safe;
  }
  const input = raw as Record<string, unknown>;
  if (typeof input.profile === 'string' &&
      BROWSER_PRESETS.some((preset) => preset.id === input.profile)) {
    safe.profile = input.profile as BrowserPresetId;
  }
  if (typeof input.profileLabel === 'string') {
    safe.profileLabel = input.profileLabel;
  }
  if (typeof input.locale === 'string') {
    safe.locale = input.locale;
  }
  if (typeof input.timezone === 'string') {
    safe.timezone = input.timezone;
  }
  if (input.colorScheme === 'dark' || input.colorScheme === 'light') {
    safe.colorScheme = input.colorScheme;
  }
  safe.features = sanitizeFeatures(input.features, safe.features);
  return safe;
};

const TargetEmulator: React.FC = () => {
  const [selected, setSelected] = useState<ModuleInfo | null>(null);
  const [output, setOutput] = useState('Select a module to run.');
  const [sessions, setSessions] = usePersistentState<SavedSession[]>(
    'metasploit-sessions',
    [],
  );

  const [profile, setProfile] = useState<BrowserPresetId>(BROWSER_PRESETS[0].id);
  const [features, setFeatures] = useState<FeatureMap>(() => ({ ...defaultFeatures }));
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [snapshot, setSnapshot] = useState<BrowserSnapshot | null>(null);

  const sandboxDoc = useMemo(() => buildSandboxDoc(), []);

  const settings = useMemo<EmulatorSettingsSnapshot>(() => {
    const preset = BROWSER_PRESETS.find((p) => p.id === profile) ?? BROWSER_PRESETS[0];
    return {
      profile: preset.id,
      profileLabel: preset.label,
      locale: preset.locale,
      timezone: preset.timezone,
      colorScheme: preset.colorScheme,
      features: { ...features },
    };
  }, [profile, features]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const requestSnapshot = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow || typeof frameWindow.postMessage !== 'function') {
      return;
    }
    frameWindow.postMessage(
      {
        type: 'collect',
        settings,
      },
      '*',
    );
  }, [settings]);

  useEffect(() => {
    requestSnapshot();
  }, [requestSnapshot]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }
      if (!event.data || event.data.type !== 'emulator-data') {
        return;
      }
      const mergedSettings = sanitizeSettings(event.data.settings, settingsRef.current);
      const data = sanitizeData(event.data.data);
      setSnapshot({
        data,
        settings: mergedSettings,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mod = modules.find((m: ModuleInfo) => m.name === e.target.value) || null;
    setSelected(mod);
    if (mod) {
      const rng = seedrandom(mod.name);
      const ip = Array.from({ length: 4 }, () => Math.floor(rng() * 256)).join('.');
      const port = Math.floor(rng() * 65535);
      const sessionId = Math.floor(rng() * 1000);
      const lines = [
        `msf6 > use ${mod.name}`,
        `[*] Connecting to ${ip}:${port}`,
        `[*] Module loaded successfully`,
        `msf6 exploit(${mod.name}) > run`,
        `[*] Session ${sessionId} opened`,
      ];
      const text = lines.join('\n');
      setOutput(text);
      setSessions((prev) => [
        ...prev.filter((s) => s.name !== mod.name),
        { name: mod.name, output: text },
      ]);
    } else {
      setOutput('Select a module to run.');
    }
  };

  const reset = () => {
    setSelected(null);
    setOutput('Select a module to run.');
  };

  const reopen = (name: string) => {
    const sess = sessions.find((s) => s.name === name);
    const mod = modules.find((m: ModuleInfo) => m.name === name) || null;
    setSelected(mod);
    setOutput(sess ? sess.output : 'Select a module to run.');
  };

  const toggleFeature = (id: FeatureId) => {
    setFeatures((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyValue = async (value: string) => {
    if (typeof navigator === 'undefined') {
      return;
    }
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      return;
    }
    try {
      await clipboard.writeText(value);
    } catch (err) {
      // ignore clipboard failures in sandboxed environments
    }
  };

  const copySnapshot = async () => {
    if (!snapshot || typeof navigator === 'undefined') {
      return;
    }
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      return;
    }
    const payload = JSON.stringify(
      {
        capturedAt: new Date(snapshot.timestamp).toISOString(),
        data: snapshot.data,
        settings: snapshot.settings,
      },
      null,
      2,
    );
    try {
      await clipboard.writeText(payload);
    } catch (err) {
      // ignore clipboard failures
    }
  };

  const dataEntries = useMemo(() => {
    if (!snapshot) return [] as { key: string; label: string; value: string }[];
    return Object.entries(snapshot.data).map(([key, value]) => ({
      key,
      label: DATA_LABELS[key] ?? formatLabel(key),
      value,
    }));
  }, [snapshot]);

  const settingsEntries = useMemo(() => {
    if (!snapshot) return [] as { key: string; label: string; value: string }[];
    return [
      { key: 'profileLabel', label: 'Preset', value: snapshot.settings.profileLabel },
      { key: 'locale', label: 'Locale', value: snapshot.settings.locale },
      { key: 'timezone', label: 'Time zone', value: snapshot.settings.timezone },
      { key: 'colorScheme', label: 'Color scheme', value: snapshot.settings.colorScheme },
    ];
  }, [snapshot]);

  const featureEntries = useMemo(() => {
    if (!snapshot) return [] as { key: FeatureId; label: string; value: string }[];
    return FEATURE_FLAGS.map((flag) => ({
      key: flag.id,
      label: flag.label,
      value: snapshot.settings.features[flag.id] ? 'Enabled' : 'Disabled',
    }));
  }, [snapshot]);

  const lastUpdated = snapshot
    ? new Date(snapshot.timestamp).toLocaleTimeString()
    : null;

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <label className="sr-only" htmlFor="module-select">
            Select module
          </label>
          <select
            id="module-select"
            aria-label="Select module"
            value={selected?.name || ''}
            onChange={handleSelect}
            className="border p-1"
          >
            <option value="">Select a module</option>
            {modules.slice(0, 50).map((m: ModuleInfo) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <button onClick={reset} className="border px-2 py-1">
            Reset
          </button>
          {sessions.length > 0 && (
            <select
              aria-label="Reopen session"
              onChange={(e) => reopen(e.target.value)}
              className="border p-1"
              defaultValue=""
            >
              <option value="">Reopen session</option>
              {sessions.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <pre
          data-testid="session-output"
          className="bg-black text-green-500 p-2 h-48 overflow-auto"
        >
          {output}
        </pre>
      </div>

      <section className="space-y-3 rounded border border-gray-700 bg-black/40 p-3 text-sm text-white">
        <header className="space-y-1">
          <h3 className="text-base font-semibold">Target browser emulator</h3>
          <p className="text-xs text-gray-300">
            Snapshot data is collected locally from a sandboxed iframe. Only non-sensitive
            environment metadata is captured.
          </p>
        </header>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="emulator-profile"
              className="text-xs uppercase tracking-wide text-gray-400"
            >
              Browser preset
            </label>
            <select
              id="emulator-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value as BrowserPresetId)}
              className="rounded border border-gray-600 bg-gray-900 px-2 py-1"
            >
              {BROWSER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs uppercase tracking-wide text-gray-400">
              Environment flags
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {FEATURE_FLAGS.map((flag) => (
                  <label key={flag.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={features[flag.id]}
                      onChange={() => toggleFeature(flag.id)}
                      aria-label={flag.label}
                    />
                    <span>{flag.label}</span>
                  </label>
                ))}
              </div>
          </fieldset>
          <button
            type="button"
            onClick={copySnapshot}
            className="self-start rounded bg-ub-orange px-3 py-1 text-black"
            aria-label="Copy snapshot JSON"
          >
            Copy snapshot JSON
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {lastUpdated ? lastUpdated : 'Waiting for sandbox response…'}
        </div>
        <div aria-live="polite" className="grid gap-3 lg:grid-cols-2">
          {snapshot ? (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Browser metadata</h4>
                <dl className="divide-y divide-gray-800 rounded border border-gray-800 bg-black/30">
                  {dataEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between gap-3 p-2"
                    >
                      <div>
                        <dt className="text-xs uppercase text-gray-400">{entry.label}</dt>
                        <dd className="font-mono text-sm break-all text-ubt-grey-100">
                          {entry.value || '—'}
                        </dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue(entry.value)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                        aria-label={`Copy ${entry.label}`}
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Emulator settings</h4>
                <dl className="divide-y divide-gray-800 rounded border border-gray-800 bg-black/30">
                  {settingsEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="flex items-center justify-between gap-3 p-2"
                    >
                      <div>
                        <dt className="text-xs uppercase text-gray-400">{entry.label}</dt>
                        <dd className="text-sm text-ubt-grey-100">{entry.value}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyValue(entry.value)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                        aria-label={`Copy ${entry.label}`}
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </dl>
                <div className="space-y-1">
                  <h5 className="text-xs uppercase tracking-wide text-gray-400">
                    Feature flags
                  </h5>
                  <dl className="divide-y divide-gray-800 rounded border border-gray-800 bg-black/30">
                    {featureEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center justify-between gap-3 p-2"
                      >
                        <div>
                          <dt className="text-xs uppercase text-gray-400">{entry.label}</dt>
                          <dd className="text-sm text-ubt-grey-100">{entry.value}</dd>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyValue(entry.value)}
                          className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                          aria-label={`Copy ${entry.label}`}
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-300">Waiting for the sandbox to respond…</p>
          )}
        </div>
      </section>

      <iframe
        ref={iframeRef}
        srcDoc={sandboxDoc}
        sandbox="allow-scripts"
        title="emulated-target-browser"
        className="hidden"
        aria-hidden="true"
        onLoad={requestSnapshot}
      />
    </div>
  );
};

export default TargetEmulator;
