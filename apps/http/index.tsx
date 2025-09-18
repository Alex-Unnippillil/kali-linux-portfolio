'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import mockTransport from './mocks/transport';
import { BodyMode, HttpMethod, HttpRequestPayload, HttpResponsePayload } from './types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-40 rounded border border-gray-800 bg-gray-900 animate-pulse" />,
});

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type TransportType = 'mock' | 'network';

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

type HttpTransport = (request: HttpRequestPayload) => Promise<HttpResponsePayload>;

const createRowId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `row-${counter}`;
  };
})();

const toHeaderRecord = (rows: KeyValueRow[]) =>
  rows.reduce<Record<string, string>>((acc, row) => {
    if (!row.key.trim()) return acc;
    acc[row.key] = row.value;
    return acc;
  }, {});

const toFormRecord = (rows: KeyValueRow[]) =>
  rows.reduce<Record<string, string>>((acc, row) => {
    if (!row.key.trim()) return acc;
    acc[row.key] = row.value;
    return acc;
  }, {});

const safeJsonValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

const hasContentTypeHeader = (headers: Record<string, string>) =>
  Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');

const toCurlCommand = (
  payload: HttpRequestPayload,
  bodyMode: BodyMode,
  jsonBody: string,
  formData: Record<string, string>
) => {
  const command: string[] = [`curl -X ${payload.method}`];
  const url = payload.url || '<url>';
  command.push(`'${url.replace(/'/g, "'\\''")}'`);

  Object.entries(payload.headers).forEach(([key, value]) => {
    command.push(`-H '${key.replace(/'/g, "'\\''")}: ${value.replace(/'/g, "'\\''")}'`);
  });

  if (bodyMode === 'json') {
    const body = jsonBody.trim();
    if (body) {
      if (!hasContentTypeHeader(payload.headers)) {
        command.push(`-H 'Content-Type: application/json'`);
      }
      command.push(`--data '${body.replace(/'/g, "'\\''")}'`);
    }
  }

  if (bodyMode === 'form') {
    const entries = Object.entries(formData);
    if (entries.length) {
      if (!hasContentTypeHeader(payload.headers)) {
        command.push(`-H 'Content-Type: application/x-www-form-urlencoded'`);
      }
      const encoded = new URLSearchParams(formData).toString();
      command.push(`--data '${encoded.replace(/'/g, "'\\''")}'`);
    }
  }

  return command.join(' ');
};

const networkTransport: HttpTransport = async (
  request: HttpRequestPayload
): Promise<HttpResponsePayload> => {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    const headers = new Headers(request.headers);
    let body: BodyInit | undefined;

    if (request.bodyMode === 'json' && request.bodyText?.trim()) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      body = request.bodyText;
    } else if (request.bodyMode === 'form' && request.formData) {
      const params = new URLSearchParams();
      Object.entries(request.formData).forEach(([key, value]) => {
        params.append(key, value);
      });
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/x-www-form-urlencoded');
      }
      body = params.toString();
    }

    const init: RequestInit = {
      method: request.method,
      headers: Object.fromEntries(headers.entries()),
    };

    if (body !== undefined && !['GET', 'HEAD'].includes(request.method)) {
      init.body = body;
    }

    const response = await fetch(request.url, init);
    const text = await response.text();
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = end - start;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: text,
      duration,
      transport: 'network',
    };
  } catch (error) {
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = end - start;
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      body: message,
      duration,
      transport: 'network',
      error: message,
    };
  }
};

export const HTTPComposer: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [transportType, setTransportType] = useState<TransportType>('mock');
  const [headers, setHeaders] = useState<KeyValueRow[]>([
    { id: createRowId(), key: '', value: '' },
  ]);
  const [bodyMode, setBodyMode] = useState<BodyMode>('none');
  const [jsonBody, setJsonBody] = useState<string>('{}');
  const [formEntries, setFormEntries] = useState<KeyValueRow[]>([
    { id: createRowId(), key: '', value: '' },
  ]);
  const [response, setResponse] = useState<HttpResponsePayload | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUrl = transportType === 'mock' ? url || 'mock://echo' : url;

  const payload = useMemo<HttpRequestPayload>(() => {
    const headerRecord = toHeaderRecord(headers);
    const formRecord = toFormRecord(formEntries);
    const request: HttpRequestPayload = {
      method,
      url: effectiveUrl,
      headers: headerRecord,
      bodyMode,
    };

    if (bodyMode === 'json') {
      request.bodyText = jsonBody.trim();
    }
    if (bodyMode === 'form') {
      request.formData = formRecord;
    }

    return request;
  }, [method, effectiveUrl, headers, bodyMode, jsonBody, formEntries]);

  const requestPreview = useMemo(() => {
    const headerRecord = toHeaderRecord(headers);
    const formRecord = toFormRecord(formEntries);

    return JSON.stringify(
      {
        method,
        url: effectiveUrl,
        transport: transportType,
        headers: headerRecord,
        bodyMode,
        body:
          bodyMode === 'json'
            ? safeJsonValue(jsonBody)
            : bodyMode === 'form'
            ? formRecord
            : undefined,
      },
      null,
      2
    );
  }, [method, effectiveUrl, transportType, headers, bodyMode, jsonBody, formEntries]);

  const curlCommand = useMemo(
    () => toCurlCommand(payload, bodyMode, jsonBody, toFormRecord(formEntries)),
    [payload, bodyMode, jsonBody, formEntries]
  );

  const addHeader = () => {
    setHeaders((prev) => [...prev, { id: createRowId(), key: '', value: '' }]);
  };

  const updateHeader = (id: string, field: 'key' | 'value', value: string) => {
    setHeaders((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeHeader = (id: string) => {
    setHeaders((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const addFormEntry = () => {
    setFormEntries((prev) => [...prev, { id: createRowId(), key: '', value: '' }]);
  };

  const updateFormEntry = (id: string, field: 'key' | 'value', value: string) => {
    setFormEntries((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeFormEntry = (id: string) => {
    setFormEntries((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const handleSend = useCallback(async () => {
    setIsSending(true);
    setError(null);

    const transport: HttpTransport = transportType === 'mock' ? mockTransport : networkTransport;

    const result = await transport(payload);
    setResponse(result);
    setError(result.error ?? null);
    setIsSending(false);
  }, [payload, transportType]);

  const responseLanguage = useMemo(() => {
    if (!response) return 'json';
    const entry = Object.entries(response.headers).find(
      ([key]) => key.toLowerCase() === 'content-type'
    );
    const value = entry?.[1] ?? '';
    if (value.includes('json')) return 'json';
    if (value.includes('xml')) return 'xml';
    if (value.includes('html')) return 'html';
    return 'plaintext';
  }, [response]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto bg-gray-900 p-4 text-white">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">HTTP Composer</h1>
        <p className="text-sm text-gray-300">
          Craft requests with multiple methods, headers, and body types. The mock transport echoes
          payloads for offline demos; switch to the network transport to send real requests.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm" htmlFor="http-method">
            Method
            <select
              id="http-method"
              className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={method}
              onChange={(event) => setMethod(event.target.value as HttpMethod)}
            >
              {METHODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex min-w-[240px] flex-1 items-center gap-2">
            <label className="sr-only" htmlFor="http-url">
              URL
            </label>
            <input
              id="http-url"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              placeholder="https://example.com/api"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <label className="text-sm" htmlFor="http-transport">
            Transport
          </label>
          <select
            id="http-transport"
            className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={transportType}
            onChange={(event) => setTransportType(event.target.value as TransportType)}
          >
            <option value="mock">Mock (offline echo)</option>
            <option value="network">Network (fetch)</option>
          </select>
          <button
            type="button"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-900"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Headers</h2>
          <button
            type="button"
            className="rounded border border-gray-700 px-3 py-1 text-sm hover:bg-gray-800"
            onClick={addHeader}
          >
            Add header
          </button>
        </div>
        <div className="space-y-2">
          {headers.map((header) => (
            <div key={header.id} className="flex flex-wrap gap-2">
              <input
                type="text"
                className="min-w-[120px] flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                placeholder="Header name"
                aria-label="Header name"
                value={header.key}
                onChange={(event) => updateHeader(header.id, 'key', event.target.value)}
              />
              <input
                type="text"
                className="min-w-[120px] flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                placeholder="Header value"
                aria-label="Header value"
                value={header.value}
                onChange={(event) => updateHeader(header.id, 'value', event.target.value)}
              />
              <button
                type="button"
                className="rounded border border-gray-700 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-50"
                onClick={() => removeHeader(header.id)}
                disabled={headers.length === 1}
                aria-label="Remove header"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Body</h2>
          <select
            aria-label="Body mode"
            className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={bodyMode}
            onChange={(event) => setBodyMode(event.target.value as BodyMode)}
          >
            <option value="none">No body</option>
            <option value="json">JSON</option>
            <option value="form">Form (URL encoded)</option>
          </select>
        </div>
        {bodyMode === 'json' && (
          <MonacoEditor
            height="200px"
            theme="vs-dark"
            language="json"
            value={jsonBody}
            onChange={(value) => setJsonBody(value ?? '')}
            options={{ minimap: { enabled: false } }}
            wrapperProps={{ 'data-testid': 'http-json-editor' }}
          />
        )}
        {bodyMode === 'form' && (
          <div className="space-y-2">
            {formEntries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  className="min-w-[120px] flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                  placeholder="Field name"
                  aria-label="Form field name"
                  value={entry.key}
                  onChange={(event) => updateFormEntry(entry.id, 'key', event.target.value)}
                />
                <input
                  type="text"
                  className="min-w-[120px] flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-white"
                  placeholder="Field value"
                  aria-label="Form field value"
                  value={entry.value}
                  onChange={(event) => updateFormEntry(entry.id, 'value', event.target.value)}
                />
                <button
                  type="button"
                  className="rounded border border-gray-700 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-50"
                  onClick={() => removeFormEntry(entry.id)}
                  disabled={formEntries.length === 1}
                  aria-label="Remove form field"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded border border-gray-700 px-3 py-1 text-sm hover:bg-gray-800"
              onClick={addFormEntry}
            >
              Add field
            </button>
          </div>
        )}
        {bodyMode === 'none' && (
          <p className="text-sm text-gray-400">No request body will be sent.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Request preview</h2>
        <MonacoEditor
          height="220px"
          theme="vs-dark"
          language="json"
          value={requestPreview}
          options={{ minimap: { enabled: false }, readOnly: true, wordWrap: 'on' }}
          wrapperProps={{ 'data-testid': 'http-request-preview' }}
        />
        <div className="rounded border border-gray-800 bg-black/40 p-3 font-mono text-sm text-green-300">
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-400">curl</div>
          <code className="block whitespace-pre-wrap break-all">{curlCommand}</code>
        </div>
      </section>

      <section className="space-y-2 pb-4">
        <h2 className="text-lg font-semibold">Response</h2>
        {response ? (
          <div className="space-y-2">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-300">
              <span>
                {response.transport === 'mock' ? 'Mock transport' : 'Network'} ·{' '}
                {Math.round(response.duration)}ms
              </span>
              <span>
                {response.status} {response.statusText}
              </span>
            </div>
            <MonacoEditor
              height="240px"
              theme="vs-dark"
              language={responseLanguage}
              value={response.body}
              options={{ minimap: { enabled: false }, readOnly: true, wordWrap: 'on' }}
              wrapperProps={{ 'data-testid': 'http-response-viewer' }}
            />
          </div>
        ) : (
          <div className="rounded border border-dashed border-gray-700 p-4 text-sm text-gray-400">
            Response output will appear here after you send a request.
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>
    </div>
  );
};

const HTTPPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = useCallback((): TabDefinition => {
    const id = `${Date.now()}-${countRef.current}`;
    countRef.current += 1;
    return { id, title: `Request ${countRef.current - 1}`, content: <HTTPComposer /> };
  }, []);

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default HTTPPreview;
