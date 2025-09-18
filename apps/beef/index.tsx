'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import BeefApp from '../../components/apps/beef';

type Severity = 'Low' | 'Medium' | 'High';

interface LogEntry {
  time: string;
  severity: Severity;
  message: string;
}

type FingerprintField = 'userAgent' | 'language' | 'timezone';

interface FingerprintData {
  userAgent: string;
  language: string;
  timezone: string;
}

interface EmulatorProfile {
  id: string;
  label: string;
  settings: FingerprintData;
}

const severityStyles: Record<Severity, { icon: string; color: string }> = {
  Low: { icon: '🟢', color: 'bg-green-700' },
  Medium: { icon: '🟡', color: 'bg-yellow-700' },
  High: { icon: '🔴', color: 'bg-red-700' },
};

const FINGERPRINT_FIELDS: { key: FingerprintField; label: string }[] = [
  { key: 'userAgent', label: 'User Agent' },
  { key: 'language', label: 'Language' },
  { key: 'timezone', label: 'Timezone' },
];

const EMULATOR_PROFILES: EmulatorProfile[] = [
  {
    id: 'desktop-chrome',
    label: 'Chrome on macOS',
    settings: {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      language: 'en-US',
      timezone: 'America/New_York',
    },
  },
  {
    id: 'mobile-safari',
    label: 'Safari on iPhone',
    settings: {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      language: 'en-GB',
      timezone: 'Europe/London',
    },
  },
  {
    id: 'android-firefox',
    label: 'Firefox on Android',
    settings: {
      userAgent:
        'Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
      language: 'de-DE',
      timezone: 'Europe/Berlin',
    },
  },
];

const defaultProfile = EMULATOR_PROFILES[0];

const BeefPage: React.FC = () => {
  const [logs] = useState<LogEntry[]>([
    { time: '10:00:00', severity: 'Low', message: 'Hook initialized' },
    { time: '10:00:02', severity: 'Medium', message: 'Payload delivered' },
    { time: '10:00:03', severity: 'High', message: 'Sensitive data exfil attempt' },
  ]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultProfile.id);
  const [emulatorSettings, setEmulatorSettings] = useState<FingerprintData>({
    ...defaultProfile.settings,
  });
  const [fingerprint, setFingerprint] = useState<FingerprintData>({
    ...defaultProfile.settings,
  });
  const [copiedField, setCopiedField] = useState<FingerprintField | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as
        | { source?: string; type?: string; payload?: Partial<FingerprintData> }
        | undefined;
      if (!data || data.source !== 'beef-demo' || data.type !== 'beef:fingerprint') {
        return;
      }
      const payload = data.payload ?? {};
      setFingerprint((prev) => ({
        userAgent: typeof payload.userAgent === 'string' && payload.userAgent.length > 0
          ? payload.userAgent
          : prev.userAgent,
        language: typeof payload.language === 'string' && payload.language.length > 0
          ? payload.language
          : prev.language,
        timezone: typeof payload.timezone === 'string' && payload.timezone.length > 0
          ? payload.timezone
          : prev.timezone,
      }));
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  useEffect(() => {
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
      copyTimer.current = null;
    }
    if (copiedField) {
      copyTimer.current = setTimeout(() => {
        setCopiedField(null);
        copyTimer.current = null;
      }, 2000);
    }

    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
        copyTimer.current = null;
      }
    };
  }, [copiedField]);

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) {
      return;
    }
    iframeRef.current.contentWindow.postMessage(
      {
        source: 'beef-control',
        type: 'beef:apply-emulator',
        payload: emulatorSettings,
      },
      '*'
    );
  }, [emulatorSettings, iframeReady]);

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) {
      return;
    }
    iframeRef.current.contentWindow.postMessage(
      {
        source: 'beef-control',
        type: 'beef:request-fingerprint',
      },
      '*'
    );
  }, [iframeReady]);

  const handleProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProfile =
      EMULATOR_PROFILES.find((profile) => profile.id === event.target.value) ?? defaultProfile;
    setSelectedProfileId(nextProfile.id);
    setEmulatorSettings({ ...nextProfile.settings });
    setFingerprint({ ...nextProfile.settings });
  };

  const handleCopy = async (field: FingerprintField) => {
    const value = fingerprint[field];
    if (!value) {
      return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      }
    } catch {
      // ignore copy errors but still show feedback so the UI feels responsive
    }
    setCopiedField(field);
  };

  return (
    <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={48}
            height={48}
          />
          <div>
            <h1 className="text-xl">BeEF Demo</h1>
            <p className="text-xs text-gray-300">Browser Exploitation Framework — safe training mode</p>
          </div>
        </div>
        <div className="flex gap-2">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="w-6 h-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="w-6 h-6"
          />
        </div>
      </header>

      <div className="p-4 flex-1 overflow-hidden flex flex-col lg:flex-row gap-4">
        <div className="flex-1 overflow-auto rounded border border-gray-700 bg-black/20">
          <BeefApp />
        </div>
        <aside
          className="w-full lg:w-80 flex-shrink-0 border border-gray-700/80 rounded bg-black/30 p-4 text-sm flex flex-col gap-4"
          aria-labelledby="fingerprint-heading"
        >
          <div className="flex items-center justify-between">
            <h2 id="fingerprint-heading" className="text-base font-semibold">
              Fingerprint
            </h2>
            <span className="text-xs text-emerald-300">Live</span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="emulatorProfile" className="text-xs uppercase text-gray-300 tracking-wide">
              Emulator profile
            </label>
            <select
              id="emulatorProfile"
              value={selectedProfileId}
              onChange={handleProfileChange}
              className="text-black rounded px-2 py-1 text-sm"
            >
              {EMULATOR_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </div>
          <dl className="space-y-3">
            {FINGERPRINT_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex items-start justify-between gap-2 border border-gray-700/60 rounded bg-black/40 p-3"
              >
                <div className="flex-1">
                  <dt className="text-xs uppercase text-gray-300 tracking-wide">{field.label}</dt>
                  <dd
                    className="text-sm break-all"
                    data-testid={`fingerprint-${field.key}`}
                    aria-live="polite"
                  >
                    {fingerprint[field.key] || '—'}
                  </dd>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(field.key)}
                  className="self-start px-2 py-1 bg-ub-primary text-white text-xs rounded"
                  aria-label={`Copy ${field.label}`}
                >
                  {copiedField === field.key ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            <iframe
              ref={iframeRef}
              title="Demo Target"
              src="/beef-demo/index.html"
              className="w-full h-40 border border-gray-700/60 rounded"
              sandbox="allow-scripts"
              onLoad={() => setIframeReady(true)}
            />
            <p className="text-xs text-gray-300">
              The sandboxed target only echoes emulator preferences. No network calls ever leave this demo.
            </p>
          </div>
        </aside>
      </div>

      <div className="border-t border-gray-700 font-mono text-sm">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-center gap-2 px-2 py-1.5">
            <span
              className={`flex items-center px-2 py-0.5 rounded-full text-xs ${severityStyles[log.severity].color}`}
            >
              <span className="mr-1">{severityStyles[log.severity].icon}</span>
              {log.severity}
            </span>
            <span className="text-gray-400">{log.time}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BeefPage;
