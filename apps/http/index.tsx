'use client';

import React, { useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import {
  simulateDnsLookup,
  type DnsLookupRequest,
  type DnsLookupResponse,
} from './dnsUtils';

type DnsStatus = 'idle' | 'resolving' | 'success' | 'error';

export const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dnsStatus, setDnsStatus] = useState<DnsStatus>('idle');
  const [dnsMessage, setDnsMessage] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      const worker = new Worker(new URL('./dnsResolver.worker.ts', import.meta.url));
      workerRef.current = worker;

      const handleMessage = (event: MessageEvent<DnsLookupResponse>) => {
        const { id } = event.data;
        if (id !== requestIdRef.current) {
          return;
        }

        if (event.data.type === 'success') {
          setDnsStatus('success');
          setDnsMessage(`Resolved ${event.data.host} to ${event.data.address}`);
        } else {
          setDnsStatus('error');
          setDnsMessage(`DNS lookup failed: ${event.data.error}`);
        }
      };

      const handleError = () => {
        setDnsStatus('error');
        setDnsMessage('DNS lookup failed: worker error.');
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      return () => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        worker.terminate();
      };
    } catch {
      workerRef.current = null;
    }
  }, []);

  const startDnsLookup = (hostname: string, requestId: number) => {
    const fallbackLookup = () => {
      simulateDnsLookup(hostname)
        .then((address) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setDnsStatus('success');
          setDnsMessage(`Resolved ${hostname} to ${address}`);
        })
        .catch((lookupError) => {
          if (requestId !== requestIdRef.current) {
            return;
          }
          const message =
            lookupError instanceof Error ? lookupError.message : 'Unknown error.';
          setDnsStatus('error');
          setDnsMessage(`DNS lookup failed: ${message}`);
        });
    };

    if (workerRef.current) {
      try {
        workerRef.current.postMessage({ id: requestId, host: hostname } satisfies DnsLookupRequest);
        return;
      } catch {
        workerRef.current = null;
      }
    }

    fallbackLookup();
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUrl(value);

    const trimmed = value.trim();
    const currentRequestId = ++requestIdRef.current;

    setDnsStatus('idle');
    setDnsMessage(null);

    if (!trimmed) {
      setError('URL is required.');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      setError('Enter a valid URL including protocol (e.g. https://example.com).');
      return;
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol === 'file:') {
      setError('file:// URLs are blocked for security reasons.');
      return;
    }

    if (protocol !== 'http:' && protocol !== 'https:') {
      setError('Only HTTP and HTTPS URLs are supported.');
      return;
    }

    setError(null);

    const hostname = parsedUrl.hostname.trim();
    if (!hostname) {
      setDnsStatus('error');
      setDnsMessage('DNS lookup failed: hostname missing.');
      return;
    }

    setDnsStatus('resolving');
    setDnsMessage('Resolving host…');

    startDnsLookup(hostname, currentRequestId);
  };

  const sanitizedUrl = url.trim();
  const command = sanitizedUrl ? `curl -X ${method} ${sanitizedUrl}` : '';
  const hasError = Boolean(error || dnsStatus === 'error');
  const feedbackId = 'http-url-feedback';

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
            className="w-full rounded border bg-gray-800 p-2 text-white focus:outline-none focus:ring"
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
            className={`w-full rounded border bg-gray-800 p-2 text-white focus:outline-none focus:ring ${
              hasError ? 'border-red-500 focus:ring-red-400' : 'border-gray-700 focus:ring-blue-400'
            }`}
            value={url}
            onChange={handleUrlChange}
            aria-invalid={hasError}
            aria-describedby={feedbackId}
            placeholder="https://example.com"
            autoComplete="off"
          />
          <div
            id={feedbackId}
            className="mt-1 min-h-[1.5rem] text-xs"
            aria-live="polite"
          >
            {error && <p className="text-red-400">{error}</p>}
            {!error && dnsStatus === 'resolving' && (
              <p className="text-yellow-300">Resolving host…</p>
            )}
            {!error && dnsStatus === 'error' && dnsMessage && (
              <p className="text-red-400">{dnsMessage}</p>
            )}
            {!error && dnsStatus === 'success' && dnsMessage && (
              <p className="text-emerald-300">{dnsMessage}</p>
            )}
          </div>
        </div>
      </form>
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

export default HTTPPreview;
