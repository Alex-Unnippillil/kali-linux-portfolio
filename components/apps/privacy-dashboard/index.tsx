'use client';

import React, { useMemo } from 'react';
import ToggleSwitch from '../../ToggleSwitch';
import { useSettings } from '../../../hooks/useSettings';
import {
  PRIVACY_PERMISSIONS,
  usePrivacyRegistry,
  setAppPermission,
  type PrivacyPermission,
} from '../../../utils/privacyRegistry';

const PERMISSION_LABELS: Record<PrivacyPermission, { label: string; description: string }> = {
  camera: {
    label: 'Camera',
    description: 'Access to the webcam or display capture streams.',
  },
  microphone: {
    label: 'Microphone',
    description: 'Listen to audio input from the current device.',
  },
  location: {
    label: 'Location',
    description: 'Use approximate geolocation derived from the browser.',
  },
  clipboard: {
    label: 'Clipboard',
    description: 'Read or write clipboard data inside the app.',
  },
};

export default function PrivacyDashboard() {
  const entries = usePrivacyRegistry();
  const { telemetry, diagnostics, setTelemetry, setDiagnostics } = useSettings();

  const totals = useMemo(
    () =>
      PRIVACY_PERMISSIONS.map((permission) => {
        const granted = entries.filter((entry) => entry.permissions[permission]).length;
        return {
          permission,
          granted,
          total: entries.length,
        };
      }),
    [entries],
  );

  return (
    <div className="h-full w-full bg-ub-dark text-white overflow-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Privacy Dashboard</h1>
        <p className="text-sm text-ubt-grey">
          Review which sandboxed apps can simulate access to sensitive device capabilities. Toggle any permission to immediately
          revoke or restore the demo behaviour. Learn how simulated data is stored in the{' '}
          <a
            href="/docs/privacy.html"
            target="_blank"
            rel="noreferrer"
            className="underline text-ub-orange"
          >
            privacy policy
          </a>
          .
        </p>
      </header>

      <section aria-labelledby="privacy-toggles" className="bg-ub-cool-grey/60 rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="privacy-toggles" className="text-lg font-semibold">
            Telemetry &amp; diagnostics
          </h2>
          <span className="text-xs text-ubt-grey uppercase tracking-wide">System Services</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between bg-ub-dark/60 rounded p-3">
            <div>
              <p className="font-medium">Telemetry</p>
              <p className="text-xs text-ubt-grey">
                Toggle synthetic analytics events that fuel the in-app activity timeline.
              </p>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle telemetry collection"
              checked={telemetry}
              onChange={setTelemetry}
            />
          </div>
          <div className="flex items-center justify-between bg-ub-dark/60 rounded p-3">
            <div>
              <p className="font-medium">Diagnostics</p>
              <p className="text-xs text-ubt-grey">
                Allow local error logging used for crash reports and troubleshooting exports.
              </p>
            </div>
            <ToggleSwitch
              ariaLabel="Toggle diagnostics collection"
              checked={diagnostics}
              onChange={setDiagnostics}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-summary" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="privacy-summary" className="text-lg font-semibold">
            Capability summary
          </h2>
          <span className="text-xs text-ubt-grey uppercase tracking-wide">Per permission</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {totals.map(({ permission, granted, total }) => {
            const meta = PERMISSION_LABELS[permission];
            return (
              <div key={permission} className="bg-ub-cool-grey/60 rounded-md p-4 space-y-1">
                <p className="text-sm font-semibold">{meta.label}</p>
                <p className="text-xs text-ubt-grey">{meta.description}</p>
                <p className="text-lg font-mono">
                  {granted} / {total}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="per-app-permissions" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="per-app-permissions" className="text-lg font-semibold">
            Per-app permissions
          </h2>
          <span className="text-xs text-ubt-grey uppercase tracking-wide">Live state</span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ubt-grey">
                <th className="p-2">Application</th>
                {PRIVACY_PERMISSIONS.map((permission) => (
                  <th key={permission} className="p-2 text-center">
                    {PERMISSION_LABELS[permission].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="odd:bg-ub-cool-grey/40 even:bg-ub-cool-grey/20">
                  <td className="p-3 space-y-1">
                    <div className="flex items-center gap-3">
                      {entry.icon ? (
                        <img src={entry.icon} alt="" className="h-8 w-8 rounded" aria-hidden="true" />
                      ) : null}
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-ubt-grey">{entry.summary}</p>
                      </div>
                    </div>
                  </td>
                  {PRIVACY_PERMISSIONS.map((permission) => {
                    const allowed = entry.permissions[permission];
                    return (
                      <td key={permission} className="p-2">
                        <div className="flex flex-col items-center space-y-2">
                          <ToggleSwitch
                            checked={allowed}
                            onChange={(next) => setAppPermission(entry.id, permission, next)}
                            ariaLabel={`${entry.name} ${PERMISSION_LABELS[permission].label} permission`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              allowed ? 'text-ub-green' : 'text-ub-red'
                            }`}
                          >
                            {allowed ? 'Allowed' : 'Blocked'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
