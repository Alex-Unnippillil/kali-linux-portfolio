import React, { useCallback, useEffect, useMemo, useState } from 'react';

import WarningBanner from '../../../WarningBanner';
import datasets from './datasets.json';

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
        <header className="space-y-2 rounded-lg border border-gray-700/70 bg-black/30 p-4 shadow-inner">
          <h1 className="text-xl font-semibold">Mimikatz Offline Workbench</h1>
          <p className="text-sm text-gray-300">
            Explore canned LSASS dumps and tabletop injects without any network calls. Load a packaged scenario below or
            import your own sanitized log to practice credential hunting in a safe lab.
          </p>
        </header>

        <section
          aria-labelledby="offline-datasets"
          className="rounded-lg border border-gray-700/70 bg-black/40 p-4 shadow-inner"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="offline-datasets" className="text-lg font-semibold">
              Packaged datasets
            </h2>
            <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-1 text-xs uppercase tracking-wide text-purple-200">
              Offline ready
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Choose a prebuilt scenario to auto-load sanitized artifacts and follow the guided investigation steps.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {datasets.map((dataset, index) => {
              const isActive = dataset.id === selectedDatasetId;
              const shortcutKey = String(index + 1);
              const artifactCount = dataset.artifacts?.length ?? 0;
              return (
                <article
                  key={dataset.id}
                  className={`flex h-full flex-col gap-3 rounded-lg border p-4 text-sm transition-all ${
                    isActive
                      ? 'border-purple-400/80 bg-ub-dark shadow-[0_0_0_1px_rgba(192,132,252,0.25)]'
                      : 'border-gray-700/80 bg-black/50 hover:border-purple-400/40'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{dataset.title}</h3>
                      <p className="mt-1 text-gray-300">{dataset.summary}</p>
                    </div>
                    <p className="text-xs text-red-200" data-testid={`${dataset.id}-safety`}>
                      {dataset.labSafety}
                    </p>
                  </div>
                  {dataset.artifacts?.length ? (
                    <dl className="grid gap-2 text-xs text-gray-300" aria-label="Dataset artifacts">
                      {dataset.artifacts.map((artifact) => (
                        <div key={`${dataset.id}-${artifact.label}`} className="flex justify-between gap-2">
                          <dt className="font-semibold text-gray-200">{artifact.label}</dt>
                          <dd className="text-right text-gray-300">{artifact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-700/60 pt-3">
                    <div className="flex flex-wrap gap-2 text-[0.7rem] font-semibold">
                      <span className="rounded-full bg-purple-500/20 px-2 py-1 text-purple-200">
                        {artifactCount} {artifactCount === 1 ? 'artifact' : 'artifacts'}
                      </span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-200">
                        Risk: {dataset.riskRating || 'Not rated'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDatasetSelect(dataset.id)}
                      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide shadow hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
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
            className="rounded-lg border border-gray-700/70 bg-black/40 p-4 text-sm shadow-inner"
          >
            <h2 id="investigation-flow" className="text-lg font-semibold">
              Investigation flow
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-200">
              {selectedDataset.flow.map((step, index) => (
                <li key={`${selectedDataset.id}-flow-${index}`}>{step}</li>
              ))}
            </ol>
          </section>
        ) : null}

        <section
          aria-labelledby="custom-import"
          className="rounded-lg border border-gray-700/70 bg-black/40 p-4 shadow-inner"
        >
          <div className="space-y-2">
            <h2 id="custom-import" className="text-lg font-semibold">
              Import sanitized dump
            </h2>
            <p className="text-xs text-gray-300">
              Upload `.txt` or `.log` exports from your own drills to parse usernames and passwords locally. Files never
              leave this browser tab.
            </p>
            <label htmlFor="custom-import-file" className="text-xs font-semibold uppercase tracking-wide text-gray-300">
              Upload sanitized dump
            </label>
            <input
              id="custom-import-file"
              type="file"
              accept=".txt,.log,application/octet-stream"
              onChange={handleFile}
              aria-label="Upload sanitized dump"
              className="block w-full rounded-md border border-gray-600 bg-black/60 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple-600 file:px-3 file:py-1 file:text-xs file:uppercase file:tracking-wide file:text-white hover:file:bg-purple-500"
            />
          </div>
        </section>

        {error ? (
          <div
            className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200 shadow-inner"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <section
          aria-labelledby="parsed-credentials"
          className="flex-1 rounded-lg border border-gray-700/70 bg-black/40 p-4 shadow-inner"
        >
          <h2 id="parsed-credentials" className="text-lg font-semibold">
            Parsed credentials
          </h2>
          {credentials.length ? (
            <ul className="mt-3 space-y-2">
              {credentials.map((credential, index) => (
                <li key={`${credential.user}-${index}`} className="rounded-lg border border-gray-700/80 bg-ub-dark p-3 text-sm">
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-purple-200">User</dt>
                      <dd
                        className="font-mono text-gray-200"
                        data-testid={`credential-user-${index}`}
                      >
                        {credential.user}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-purple-200">Password</dt>
                      <dd
                        className="break-all font-mono text-gray-200"
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
            <p className="mt-3 rounded-md border border-dashed border-gray-700/70 bg-black/30 p-3 text-sm text-gray-300">
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

