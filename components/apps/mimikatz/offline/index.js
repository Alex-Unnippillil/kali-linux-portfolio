import React, { useMemo, useState } from 'react';

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

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [selectedDatasetId]
  );

  const loadDump = (text, emptyStateMessage = 'No credentials found') => {
    const parsed = parseDump(text);
    setCredentials(parsed);
    setError(parsed.length ? '' : emptyStateMessage);
  };

  const handleDatasetSelect = (datasetId) => {
    setSelectedDatasetId(datasetId);
    const dataset = datasets.find((entry) => entry.id === datasetId);
    if (!dataset) return;
    loadDump(dataset.dump, 'No credentials found in dataset');
  };

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
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">Mimikatz Offline Workbench</h1>
          <p className="text-sm text-gray-300">
            Explore canned LSASS dumps and tabletop injects without any network calls. Load a packaged scenario below or
            import your own sanitized log to practice credential hunting in a safe lab.
          </p>
        </header>

        <section aria-labelledby="offline-datasets">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 id="offline-datasets" className="text-lg font-semibold">
              Packaged datasets
            </h2>
            <span className="text-xs uppercase tracking-wide text-purple-200">Offline ready</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {datasets.map((dataset) => {
              const isActive = dataset.id === selectedDatasetId;
              return (
                <article
                  key={dataset.id}
                  className={`rounded border p-3 text-sm transition-colors ${
                    isActive ? 'border-purple-400 bg-ub-dark' : 'border-gray-700 bg-black/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{dataset.title}</h3>
                      <p className="text-gray-300 mt-1">{dataset.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDatasetSelect(dataset.id)}
                      className="rounded bg-purple-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-purple-500"
                    >
                      {isActive ? 'Reload dataset' : `Load ${dataset.title}`}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-red-200" data-testid={`${dataset.id}-safety`}>
                    {dataset.labSafety}
                  </p>
                  {dataset.artifacts?.length ? (
                    <dl className="mt-3 grid gap-2 text-xs text-gray-300" aria-label="Dataset artifacts">
                      {dataset.artifacts.map((artifact) => (
                        <div key={`${dataset.id}-${artifact.label}`} className="flex justify-between gap-2">
                          <dt className="font-semibold text-gray-200">{artifact.label}</dt>
                          <dd className="text-right text-gray-300">{artifact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {selectedDataset ? (
          <section aria-labelledby="investigation-flow" className="rounded border border-gray-700 bg-black/40 p-3 text-sm">
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

        <section aria-labelledby="custom-import" className="space-y-2">
          <h2 id="custom-import" className="text-lg font-semibold">
            Import sanitized dump
          </h2>
          <p className="text-xs text-gray-300">
            Upload `.txt` or `.log` exports from your own drills to parse usernames and passwords locally. Files never
            leave this browser tab.
          </p>
          <label htmlFor="custom-import-file" className="sr-only">
            Upload sanitized dump
          </label>
          <input
            id="custom-import-file"
            type="file"
            accept=".txt,.log,application/octet-stream"
            onChange={handleFile}
            aria-label="Upload sanitized dump"
            className="block w-full rounded border border-gray-700 bg-black/40 p-2 text-sm"
          />
        </section>

        {error && <div className="text-red-300 text-sm" role="alert">{error}</div>}

        <section aria-labelledby="parsed-credentials" className="flex-1">
          <h2 id="parsed-credentials" className="text-lg font-semibold">
            Parsed credentials
          </h2>
          {credentials.length ? (
            <ul className="mt-2 space-y-2">
              {credentials.map((credential, index) => (
                <li key={`${credential.user}-${index}`} className="rounded bg-ub-dark p-3 text-sm">
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-purple-200">User</dt>
                      <dd
                        className="text-gray-200 font-mono"
                        data-testid={`credential-user-${index}`}
                      >
                        {credential.user}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-purple-200">Password</dt>
                      <dd
                        className="text-gray-200 font-mono break-all"
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
            <p className="mt-2 text-sm text-gray-300">No credentials parsed yet.</p>
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

