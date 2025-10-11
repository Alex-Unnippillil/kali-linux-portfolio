'use client';

import React, { useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type HeaderRow = {
  id: number;
  name: string;
  value: string;
};

const URL_PLACEHOLDER = '<url>';

export const HTTPBuilder: React.FC = () => {
  const headerIdRef = useRef(1);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: headerIdRef.current, name: '', value: '' },
  ]);
  const [isHeadersOpen, setHeadersOpen] = useState(false);
  const [isBodyOpen, setBodyOpen] = useState(false);
  const [body, setBody] = useState('');

  const sanitizedHeaders = useMemo(
    () =>
      headers.filter((header) => header.name.trim() || header.value.trim()),
    [headers]
  );

  const commandParts = useMemo(() => {
    const headerSegments = sanitizedHeaders.map(
      (header) => `-H '${header.name.trim()}: ${header.value.trim()}'`
    );
    const urlSegment = url.trim() ? `'${url.trim()}'` : URL_PLACEHOLDER;
    const bodySegment = body.trim()
      ? [`--data '${body.trim().replace(/'/g, "'\\''")}'`]
      : [];

    return ['curl', '-X', method, ...headerSegments, urlSegment, ...bodySegment];
  }, [body, method, sanitizedHeaders, url]);

  const command = useMemo(() => commandParts.join(' '), [commandParts]);

  const copyToClipboard = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return;
      }
      await navigator.clipboard.writeText(command);
    } catch (error) {
      // Clipboard access can fail silently in some environments.
    }
  };

  const addHeaderRow = () => {
    headerIdRef.current += 1;
    setHeaders((prev) => [
      ...prev,
      { id: headerIdRef.current, name: '', value: '' },
    ]);
  };

  const updateHeaderRow = (
    id: number,
    field: 'name' | 'value',
    value: string
  ) => {
    setHeaders((prev) =>
      prev.map((header) =>
        header.id === id ? { ...header, [field]: value } : header
      )
    );
  };

  const removeHeaderRow = (id: number) => {
    setHeaders((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));
  };

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Build a curl command without sending any requests. Learn more at{' '}
        <a
          href="https://curl.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          the curl project page
        </a>
        .
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-4">
        <div>
          <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
            Method
          </label>
          <select
            id="http-method"
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
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="rounded border border-gray-700 bg-gray-800">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-gray-700"
            onClick={() => setHeadersOpen((prev) => !prev)}
            aria-expanded={isHeadersOpen}
            aria-controls="http-headers-section"
          >
            <span>Headers</span>
            <span aria-hidden="true">{isHeadersOpen ? '−' : '+'}</span>
          </button>
          {isHeadersOpen && (
            <div id="http-headers-section" className="space-y-3 border-t border-gray-700 p-4">
              {headers.map((header) => (
                <div key={header.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div>
                    <label
                      htmlFor={`header-name-${header.id}`}
                      className="mb-1 block text-xs font-semibold uppercase text-gray-300"
                    >
                      Header name
                    </label>
                    <input
                      id={`header-name-${header.id}`}
                      type="text"
                      placeholder="Authorization"
                      className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white"
                      value={header.name}
                      onChange={(e) =>
                        updateHeaderRow(header.id, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`header-value-${header.id}`}
                      className="mb-1 block text-xs font-semibold uppercase text-gray-300"
                    >
                      Header value
                    </label>
                    <input
                      id={`header-value-${header.id}`}
                      type="text"
                      placeholder="Bearer token"
                      className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white"
                      value={header.value}
                      onChange={(e) =>
                        updateHeaderRow(header.id, 'value', e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 rounded border border-gray-600 px-3 py-2 text-xs uppercase tracking-wide text-gray-200 hover:bg-gray-700 sm:mt-0"
                    onClick={() => removeHeaderRow(header.id)}
                    aria-label="Remove header"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded border border-dashed border-gray-500 px-3 py-2 text-xs uppercase tracking-wide text-gray-300 hover:bg-gray-700"
                onClick={addHeaderRow}
              >
                Add header
              </button>
            </div>
          )}
        </div>
        <div className="rounded border border-gray-700 bg-gray-800">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-gray-700"
            onClick={() => setBodyOpen((prev) => !prev)}
            aria-expanded={isBodyOpen}
            aria-controls="http-body-section"
          >
            <span>JSON body</span>
            <span aria-hidden="true">{isBodyOpen ? '−' : '+'}</span>
          </button>
          {isBodyOpen && (
            <div id="http-body-section" className="border-t border-gray-700 p-4">
              <label
                htmlFor="http-body"
                className="mb-2 block text-xs font-semibold uppercase text-gray-300"
              >
                Request payload
              </label>
              <textarea
                id="http-body"
                rows={6}
                className="w-full rounded border border-gray-700 bg-gray-900 p-2 font-mono text-sm text-white"
                placeholder='{"example": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-400">
                Tip: keep JSON minified for easier copy/paste. Pretty printing still works at the terminal.
              </p>
            </div>
          )}
        </div>
      </form>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg">Command Preview</h2>
          <button
            type="button"
            className="rounded border border-gray-600 px-3 py-1 text-xs uppercase tracking-wide text-gray-200 hover:bg-gray-700"
            onClick={copyToClipboard}
          >
            Copy command
          </button>
        </div>
        <p className="mb-2 text-xs text-gray-400">
          Hint: replace highlighted placeholders before running in your terminal.
        </p>
        <pre
          data-testid="command-preview"
          className="overflow-auto rounded bg-black p-3 font-mono text-green-400"
        >
          <code>
            {commandParts.map((part, index) => (
              <React.Fragment key={`${part}-${index}`}>
                {index > 0 && ' '}
                <span className={part === URL_PLACEHOLDER ? 'bg-yellow-700 text-yellow-200' : undefined}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </code>
        </pre>
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
