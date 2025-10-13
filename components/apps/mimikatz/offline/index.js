import React, { useCallback, useEffect, useMemo, useState } from 'react';

import WarningBanner from '../../../WarningBanner';
import datasets from './datasets.json';

const severityFromRisk = (riskRating = '') => {
  const normalized = riskRating.toLowerCase();
  if (normalized.startsWith('critical')) return 'critical';
  if (normalized.startsWith('high')) return 'high';
  if (normalized.startsWith('moderate') || normalized.startsWith('medium')) return 'medium';
  return 'low';
};

const severityPillTokens = {
  low: 'border border-kali-severity-low/50 bg-kali-severity-low/15 text-white',
  medium: 'border border-kali-severity-medium/60 bg-kali-severity-medium/20 text-white',
  high: 'border border-kali-severity-high/60 bg-kali-severity-high/20 text-white',
  critical: 'border border-kali-severity-critical/60 bg-kali-severity-critical/25 text-white',
};

const severityMessageTokens = {
  low: 'border-kali-severity-low/60 bg-kali-severity-low/10 text-white/90',
  medium: 'border-kali-severity-medium/70 bg-kali-severity-medium/15 text-white/95',
  high: 'border-kali-severity-high/70 bg-kali-severity-high/15 text-white',
  critical: 'border-kali-severity-critical/70 bg-kali-severity-critical/20 text-white',
};

export const parseDump = (text) => {
  const lines = text.split(/\r?\n/);
  const creds = [];
  let current = {};
  const userRegex = /user(?:name)?\s*[:=]\s*(\S+)/i;
  const passRegex = /pass(?:word)?\s*[:=]\s*(\S+)/i;

  lines.forEach((line) => {
    const u = line.match(userRegex);
    const p = line.match(passRegex);
    if (u) current.user = u[1];
    if (p) current.password = p[1];
    if (current.user && current.password) {
      creds.push(current);
      current = {};
    }
  });
  return creds;
};

const MimikatzOffline = () => {
  const [credentials, setCredentials] = useState([]);
  const [error, setError] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');

  const datasetShortcutMap = useMemo(() => {
    const map = new Map();
    datasets.forEach((dataset, index) => {
      map.set(String(index + 1), dataset.id);
    });
    return map;
  }, []);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [selectedDatasetId]
  );

  const loadDump = useCallback((text, emptyStateMessage = 'No credentials found') => {
    const parsed = parseDump(text);
    setCredentials(parsed);
    setError(parsed.length ? '' : emptyStateMessage);
  }, []);

  const handleDatasetSelect = useCallback(
    (datasetId) => {
      setSelectedDatasetId(datasetId);
      const dataset = datasets.find((entry) => entry.id === datasetId);
      if (!dataset) return;
      loadDump(dataset.dump, 'No credentials found in dataset');
    },
    [loadDump]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const datasetId = datasetShortcutMap.get(event.key);
      if (!datasetId) return;

      event.preventDefault();
      handleDatasetSelect(datasetId);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [datasetShortcutMap, handleDatasetSelect]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedDatasetId('');
    file
      .text()
      .then((text) => {
        loadDump(text);
      })
      .catch(() => {
        setError('Failed to read file');
        setCredentials([]);
      });
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <WarningBanner>
        Offline simulator. Sanitized datasets only. Keep exports inside the training lab and reset before closing the
        window.
      </WarningBanner>
      <div className="p-4 flex flex-col gap-6 overflow-y-auto">
        <header className="space-y-2 rounded-lg border border-kali-border/60 bg-kali-surface/80 p-4 shadow-inner">
          <h1 className="text-xl font-semibold">Mimikatz Offline Workbench</h1>
          <p className="text-sm text-kali-muted">
            Explore canned LSASS dumps and tabletop injects without any network calls. Load a packaged scenario below or
            import your own sanitized log to practice credential hunting in a safe lab.
          </p>
        </header>

        <section
          aria-labelledby="offline-datasets"
          className="rounded-lg border border-kali-border/60 bg-kali-surface/80 p-4 shadow-inner"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="offline-datasets" className="text-lg font-semibold">
              Packaged datasets
            </h2>
            <span className="rounded-full border border-kali-accent/30 bg-kali-accent/10 px-2 py-1 text-xs uppercase tracking-wide text-kali-accent">
              Offline ready
            </span>
          </div>
          <p className="mt-2 text-xs text-kali-muted">
            Choose a prebuilt scenario to auto-load sanitized artifacts and follow the guided investigation steps.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {datasets.map((dataset, index) => {
              const isActive = dataset.id === selectedDatasetId;
              const shortcutKey = String(index + 1);
              const artifactCount = dataset.artifacts?.length ?? 0;
              const riskSeverity = severityFromRisk(dataset.riskRating || '');
              const riskTone = severityPillTokens[riskSeverity] ?? severityPillTokens.low;
              const safetyTone = severityMessageTokens[riskSeverity] ?? severityMessageTokens.low;
              return (
                <article
                  key={dataset.id}
                  className={`flex h-full flex-col gap-3 rounded-lg border p-4 text-sm transition-all ${
                    isActive
                      ? 'border-kali-accent/70 bg-kali-surface shadow-[0_0_0_1px_rgba(15,148,210,0.3)]'
                      : 'border-kali-border/60 bg-kali-surface/80 hover:border-kali-accent/40'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{dataset.title}</h3>
                      <p className="mt-1 text-kali-muted">{dataset.summary}</p>
                    </div>
                    <p
                      className={`rounded-md border border-l-4 px-3 py-2 text-xs leading-relaxed ${
                        safetyTone
                      }`}
                      data-testid={`${dataset.id}-safety`}
                    >
                      {dataset.labSafety}
                    </p>
                  </div>
                  {dataset.artifacts?.length ? (
                    <dl className="grid gap-2 text-xs text-kali-muted" aria-label="Dataset artifacts">
                      {dataset.artifacts.map((artifact) => (
                        <div key={`${dataset.id}-${artifact.label}`} className="flex justify-between gap-2">
                          <dt className="font-semibold text-kali-text">{artifact.label}</dt>
                          <dd className="text-right text-kali-muted">{artifact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-kali-border/60 pt-3">
                    <div className="flex flex-wrap gap-2 text-[0.7rem] font-semibold">
                      <span className="rounded-full bg-kali-accent/15 px-2 py-1 text-kali-accent">
                        {artifactCount} {artifactCount === 1 ? 'artifact' : 'artifacts'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 uppercase tracking-wide ${riskTone}`}
                      >
                        Risk: {dataset.riskRating || 'Not rated'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDatasetSelect(dataset.id)}
                      className="inline-flex items-center justify-center rounded-md bg-kali-control px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow transition-colors hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                    >
                      {isActive
                        ? `Reload dataset (Shortcut ${shortcutKey})`
                        : `Load ${dataset.title} (Shortcut ${shortcutKey})`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {selectedDataset ? (
          <section
            aria-labelledby="investigation-flow"
            className="rounded-lg border border-kali-border/60 bg-kali-surface/80 p-4 text-sm shadow-inner"
          >
            <h2 id="investigation-flow" className="text-lg font-semibold">
              Investigation flow
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-kali-text">
              {selectedDataset.flow.map((step, index) => (
                <li key={`${selectedDataset.id}-flow-${index}`}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        <section
          aria-labelledby="custom-import"
          className="rounded-lg border border-kali-border/60 bg-kali-surface/80 p-4 shadow-inner"
        >
          <div className="space-y-2">
            <h2 id="custom-import" className="text-lg font-semibold">
              Import sanitized dump
            </h2>
            <p className="text-xs text-kali-muted">
              Upload `.txt` or `.log` exports from your own drills to parse usernames and passwords locally. Files never
              leave this browser tab.
            </p>
            <label htmlFor="custom-import-file" className="text-xs font-semibold uppercase tracking-wide text-kali-muted">
              Upload sanitized dump
            </label>
            <input
              id="custom-import-file"
              type="file"
              accept=".txt,.log,application/octet-stream"
              onChange={handleFile}
              aria-label="Upload sanitized dump"
              className="block w-full rounded-md border border-kali-border/60 bg-kali-surface/80 p-2 text-sm text-kali-text shadow-inner shadow-black/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus file:mr-3 file:rounded-md file:border-0 file:bg-kali-control file:px-3 file:py-1 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-black hover:file:bg-kali-control/90"
            />
          </div>
        </section>

        {error ? (
          <div
            className="rounded-lg border border-kali-severity-high/70 bg-kali-severity-high/15 p-3 text-sm text-white shadow-inner"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <section
          aria-labelledby="parsed-credentials"
          className="flex-1 rounded-lg border border-kali-border/60 bg-kali-surface/80 p-4 text-sm shadow-inner"
        >
          <h2 id="parsed-credentials" className="text-lg font-semibold">
            Parsed credentials
          </h2>
          {credentials.length ? (
            <ul className="mt-3 space-y-2">
              {credentials.map((credential, index) => (
                <li key={`${credential.user}-${index}`} className="rounded-lg border border-kali-border/60 bg-kali-surface p-3">
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-kali-accent">User</dt>
                      <dd
                        className="font-mono text-kali-text"
                        data-testid={`credential-user-${index}`}
                      >
                        {credential.user}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-kali-accent">Password</dt>
                      <dd
                        className="break-all font-mono text-kali-text"
                        data-testid={`credential-password-${index}`}
                      >
                        {credential.password}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-kali-border/60 bg-kali-surface/80 p-3 text-kali-muted">
              No credentials parsed yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default MimikatzOffline;

export const displayMimikatzOffline = (addFolder, openApp) => {
  return <MimikatzOffline addFolder={addFolder} openApp={openApp} />;
};

