'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';

import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import AuthPanel, {
  AuthChangePayload,
  AuthExportState,
  AuthState,
  redactAuthForExport,
} from './components/AuthPanel';

const emptyAuthState: AuthState = { type: 'none' };

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [authExport, setAuthExport] = useState<AuthExportState>(() =>
    redactAuthForExport(emptyAuthState),
  );

  const handleAuthChange = useCallback(({ header, exportData }: AuthChangePayload) => {
    setAuthHeader(header);
    setAuthExport(exportData);
  }, []);

  const command = useMemo(() => {
    const parts = [`curl -X ${method}`];
    if (authHeader) {
      parts.push(`-H 'Authorization: ${authHeader}'`);
    }
    if (url) {
      parts.push(url);
    }
    return parts.join(' ');
  }, [method, url, authHeader]);

  const handleExportRequest = async () => {
    const payload = {
      method,
      url,
      auth: authExport,
    };
    const serialized = JSON.stringify(payload, null, 2);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(serialized);
        return;
      }
    } catch {
      // fall through to file download fallback
    }

    try {
      const blob = new Blob([serialized], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = 'http-request.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(href);
    } catch {
      // ignore download errors in environments without DOM access
    }
  };

  return (
    <div className="h-full space-y-6 overflow-auto bg-gray-900 p-4 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl">HTTP Request Builder</h1>
          <p className="text-sm text-yellow-300">
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
        </div>
        <button
          type="button"
          onClick={handleExportRequest}
          className="h-10 rounded border border-gray-600 px-4 text-sm font-semibold uppercase tracking-wide text-gray-100 hover:bg-gray-800"
        >
          Export JSON
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
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
        <AuthPanel onAuthChange={handleAuthChange} />
      </div>

      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
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

export { HTTPBuilder };
export default HTTPPreview;
