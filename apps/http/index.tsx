'use client';

import React, { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import { buildCurlCommand, buildRawRequest, HeaderEntry } from './utils';

type HeaderRow = HeaderEntry & { id: string };

const createHeaderRow = (id: number): HeaderRow => ({
  id: id.toString(),
  key: '',
  value: '',
});

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([createHeaderRow(0)]);
  const [body, setBody] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const headerIdRef = useRef(1);

  const requestState = useMemo(
    () => ({
      method,
      url,
      headers: headers.map(({ key, value }) => ({ key, value })),
      body,
    }),
    [method, url, headers, body],
  );

  const command = useMemo(() => buildCurlCommand(requestState), [requestState]);
  const rawRequest = useMemo(() => buildRawRequest(requestState), [requestState]);

  const hasRequestDetails = useMemo(() => {
    if (url.trim().length > 0 || body.length > 0) {
      return true;
    }

    return headers.some((header) => header.key.trim().length > 0 || header.value.trim().length > 0);
  }, [url, body, headers]);

  const handleHeaderChange = (id: string, field: 'key' | 'value', value: string) => {
    setHeaders((prev) =>
      prev.map((header) =>
        header.id === id
          ? {
              ...header,
              [field]: value,
            }
          : header,
      ),
    );
  };

  const handleAddHeader = () => {
    setHeaders((prev) => [...prev, createHeaderRow(headerIdRef.current++)]);
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders((prev) => {
      const next = prev.filter((header) => header.id !== id);
      return next.length > 0 ? next : [createHeaderRow(headerIdRef.current++)];
    });
  };

  const handleExport = async () => {
    if (!hasRequestDetails) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Unable to copy curl command', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 4000);
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-6 text-sm text-yellow-300">
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
      <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
                Method
              </label>
              <select
                id="http-method"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>
            <div>
              <label htmlFor="http-url" className="mb-1 block text-sm font-medium">
                URL
              </label>
              <input
                id="http-url"
                type="text"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/api"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Headers</label>
                <button
                  type="button"
                  onClick={handleAddHeader}
                  className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Add header
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((header) => (
                  <div key={header.id} className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      type="text"
                      className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="Header"
                      value={header.key}
                      onChange={(event) => handleHeaderChange(header.id, 'key', event.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                      placeholder="Value"
                      value={header.value}
                      onChange={(event) => handleHeaderChange(header.id, 'value', event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(header.id)}
                      className="self-start rounded border border-red-700 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-900/40 md:self-auto"
                      aria-label="Remove header"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="http-body" className="mb-1 block text-sm font-medium">
                Body
              </label>
              <textarea
                id="http-body"
                className="h-48 w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`{
  "example": true
}`}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">curl export</h2>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!hasRequestDetails}
                  className={`rounded px-3 py-1 text-sm font-semibold text-white transition-colors ${
                    hasRequestDetails ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  Copy command
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all rounded bg-black p-3 font-mono text-green-400">
                {hasRequestDetails ? command : '# Fill in the form to generate a command'}
              </pre>
              {copyStatus === 'copied' && (
                <p className="mt-2 text-xs text-green-300">Command copied to clipboard.</p>
              )}
              {copyStatus === 'error' && (
                <p className="mt-2 text-xs text-red-300">Unable to copy. Please copy manually.</p>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Raw Request Preview</h2>
              <pre className="whitespace-pre-wrap break-words rounded bg-black p-3 font-mono text-blue-300">
                {hasRequestDetails ? rawRequest : '# Request line, headers, and body will appear here'}
              </pre>
            </div>
          </div>
        </div>
      </form>
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
