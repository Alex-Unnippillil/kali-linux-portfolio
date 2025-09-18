'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import tlsReference from '../../data/tls-reference.json';

type TLSItem = {
  id: string;
  name: string;
  summary: string;
  compatibility: string;
  usage: string;
  version?: string;
};

type TLSReferenceData = {
  versions: TLSItem[];
  ciphers: TLSItem[];
};

const TLS_REFERENCE: TLSReferenceData = tlsReference as TLSReferenceData;
const TLS_STORAGE_KEY = 'http-tls-selection';

const TLSReferencePanel: React.FC = () => {
  const versions = useMemo(() => TLS_REFERENCE.versions ?? [], []);
  const ciphers = useMemo(() => TLS_REFERENCE.ciphers ?? [], []);
  const allItems = useMemo(() => [...versions, ...ciphers], [versions, ciphers]);
  const fallbackId = allItems[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(fallbackId);

  useEffect(() => {
    if (!allItems.length) return;
    try {
      const stored = localStorage.getItem(TLS_STORAGE_KEY);
      if (stored && allItems.some((item) => item.id === stored)) {
        setSelectedId(stored);
      }
    } catch {
      // ignore persistence errors
    }
  }, [allItems]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      localStorage.setItem(TLS_STORAGE_KEY, selectedId);
    } catch {
      // ignore persistence errors
    }
  }, [selectedId]);

  const selectedItem = useMemo(
    () => allItems.find((item) => item.id === selectedId) ?? allItems[0],
    [allItems, selectedId],
  );

  if (!allItems.length || !selectedItem) {
    return null;
  }

  const renderItem = (item: TLSItem) => {
    const isActive = item.id === selectedItem.id;
    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => setSelectedId(item.id)}
          aria-current={isActive ? 'true' : undefined}
          className={`w-full rounded px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }`}
        >
          <span className="font-semibold">{item.name}</span>
          <span className="mt-1 block text-xs text-gray-300">{item.summary}</span>
          {item.version && (
            <span className="mt-1 block text-[10px] uppercase tracking-wide text-gray-400">
              {item.version}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <aside
      aria-labelledby="tls-reference-heading"
      className="rounded border border-gray-700 bg-gray-900 p-4 text-sm text-gray-100"
    >
      <h2 id="tls-reference-heading" className="text-base font-semibold text-white">
        TLS versions & cipher suites
      </h2>
      <p className="mt-1 mb-3 text-xs text-gray-300">
        Select an item to review compatibility and rollout notes.
      </p>
      <div className="flex flex-col gap-4">
        <div>
          <h3
            id="tls-versions-heading"
            className="text-xs font-semibold uppercase tracking-wide text-gray-400"
          >
            Versions
          </h3>
          <ul aria-labelledby="tls-versions-heading" className="mt-1 space-y-2">
            {versions.map(renderItem)}
          </ul>
        </div>
        <div>
          <h3
            id="tls-ciphers-heading"
            className="text-xs font-semibold uppercase tracking-wide text-gray-400"
          >
            Cipher suites
          </h3>
          <ul aria-labelledby="tls-ciphers-heading" className="mt-1 space-y-2">
            {ciphers.map(renderItem)}
          </ul>
        </div>
      </div>
      <div
        id="tls-reference-panel"
        role="region"
        aria-live="polite"
        className="mt-4 rounded border border-gray-700 bg-gray-950 p-3 text-sm text-gray-200"
      >
        <h3 className="text-sm font-semibold text-white">{selectedItem.name}</h3>
        <p className="mt-1 text-xs text-gray-300">{selectedItem.summary}</p>
        <dl className="mt-3 space-y-2 text-xs text-gray-200">
          {selectedItem.version && (
            <div>
              <dt className="font-semibold text-gray-100">Applies to</dt>
              <dd className="text-gray-300">{selectedItem.version}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold text-gray-100">Compatibility notes</dt>
            <dd className="text-gray-300">{selectedItem.compatibility}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Recommended usage</dt>
            <dd className="text-gray-300">{selectedItem.usage}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
};

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const command = `curl -X ${method} ${url}`.trim();

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Build a curl command without sending any requests. Learn more at{' '}
        <a
          href="https://curl.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          the curl project page
        </a>
        .
      </p>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
                Method
              </label>
              <select
                id="http-method"
                aria-label="HTTP method"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label htmlFor="http-url" className="mb-1 block text-sm font-medium">
                URL
              </label>
              <input
                id="http-url"
                type="text"
                aria-label="Request URL"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </form>
          <div>
            <h2 className="mb-2 text-lg">Command Preview</h2>
            <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
              {command || '# Fill in the form to generate a command'}
            </pre>
          </div>
        </div>
        <div className="lg:w-80 xl:w-96">
          <TLSReferencePanel />
        </div>
      </div>
    </div>
  );
};

const HTTPPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Request ${countRef.current++}`, content: <HTTPBuilder /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default HTTPPreview;
