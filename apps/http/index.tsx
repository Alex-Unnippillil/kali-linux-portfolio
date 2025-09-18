'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const ORIGIN_OPTIONS = [
  { value: 'wildcard', label: '* (Wildcard)' },
  { value: 'https://app.demo.local', label: 'https://app.demo.local (SPA)' },
  { value: 'https://admin.demo.local', label: 'https://admin.demo.local (Admin console)' },
  { value: 'custom', label: 'Custom origin' },
] as const;
const DEFAULT_URL = 'https://api.demo.local/v1/resources';
const DEFAULT_SPECIFIC_ORIGIN = 'https://app.demo.local';

type CorsMethod = (typeof METHOD_OPTIONS)[number];

interface HeaderRow {
  name: string;
  value: string;
  muted?: boolean;
}

function sanitizeList(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toHeaderCase(value: string): string {
  return value
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join('-');
}

function ensureUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) return new URL(DEFAULT_URL);
  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(trimmed, DEFAULT_URL);
    } catch {
      return new URL(DEFAULT_URL);
    }
  }
}

function clampPositiveInt(value: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState<CorsMethod>('GET');
  const [url, setUrl] = useState<string>(DEFAULT_URL);
  const [allowedMethods, setAllowedMethods] = useState('GET, POST, OPTIONS');
  const [allowedHeaders, setAllowedHeaders] = useState('Content-Type, Authorization');
  const [exposedHeaders, setExposedHeaders] = useState('X-Request-Id');
  const [maxAge, setMaxAge] = useState('600');
  const [originSelection, setOriginSelection] = useState<string>(DEFAULT_SPECIFIC_ORIGIN);
  const [customOrigin, setCustomOrigin] = useState('https://client.demo.local');
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [cacheScope, setCacheScope] = useState<'public' | 'private'>('public');
  const [autoOriginMessage, setAutoOriginMessage] = useState<string | null>(null);
  const [cacheScopeMessage, setCacheScopeMessage] = useState<string | null>(null);

  const previousCacheScopeRef = useRef<'public' | 'private'>('public');

  const resolvedUrl = useMemo(() => ensureUrl(url), [url]);
  const sanitizedRequestHeaders = useMemo(() => sanitizeList(allowedHeaders), [allowedHeaders]);
  const requestHeadersDisplay = useMemo(
    () => sanitizedRequestHeaders.map(toHeaderCase),
    [sanitizedRequestHeaders],
  );
  const requestHeadersLower = useMemo(
    () => sanitizedRequestHeaders.map((header) => header.toLowerCase()),
    [sanitizedRequestHeaders],
  );
  const sanitizedExposeHeaders = useMemo(() => sanitizeList(exposedHeaders), [exposedHeaders]);
  const exposeHeadersDisplay = useMemo(
    () => sanitizedExposeHeaders.map(toHeaderCase),
    [sanitizedExposeHeaders],
  );
  const allowedMethodList = useMemo(() => {
    const items = sanitizeList(allowedMethods).map((item) => item.toUpperCase());
    const active = method.toUpperCase();
    if (!items.includes(active)) items.push(active);
    return items;
  }, [allowedMethods, method]);
  const allowMethodsValue = allowedMethodList.join(', ');
  const allowHeadersValue = requestHeadersDisplay.length
    ? requestHeadersDisplay.join(', ')
    : '— (simple request headers only)';
  const exposeHeadersValue = exposeHeadersDisplay.length
    ? exposeHeadersDisplay.join(', ')
    : '—';

  const effectiveOrigin = useMemo(() => {
    if (originSelection === 'wildcard') return '*';
    if (originSelection === 'custom') {
      const trimmed = customOrigin.trim();
      return trimmed || 'https://client.demo.local';
    }
    return originSelection;
  }, [originSelection, customOrigin]);

  const varyHeaderValue = useMemo(() => {
    const varyParts = ['Origin'];
    if (requestHeadersDisplay.length) varyParts.push('Access-Control-Request-Headers');
    return varyParts.join(', ');
  }, [requestHeadersDisplay]);

  const maxAgeSeconds = useMemo(() => clampPositiveInt(maxAge), [maxAge]);

  useEffect(() => {
    if (!includeCredentials) {
      setAutoOriginMessage(null);
      return;
    }
    if (originSelection === 'wildcard') {
      setOriginSelection(DEFAULT_SPECIFIC_ORIGIN);
    }
    setAutoOriginMessage(
      'Wildcard origins (*) are disabled while credentials are allowed. Choose a specific origin.',
    );
  }, [includeCredentials, originSelection]);

  useEffect(() => {
    if (includeCredentials) {
      if (cacheScope !== 'private') {
        previousCacheScopeRef.current = cacheScope;
        setCacheScope('private');
        setCacheScopeMessage(
          'Credentialed responses bypass shared caches. Cache scope was reset to Private.',
        );
      }
    } else {
      setCacheScopeMessage(null);
    }
  }, [includeCredentials, cacheScope]);

  useEffect(() => {
    if (!includeCredentials) {
      previousCacheScopeRef.current = cacheScope;
    }
  }, [cacheScope, includeCredentials]);

  useEffect(() => {
    if (!includeCredentials && cacheScope === 'private' && previousCacheScopeRef.current !== 'private') {
      setCacheScope(previousCacheScopeRef.current);
    }
  }, [includeCredentials, cacheScope]);

  const computedHeaders: HeaderRow[] = useMemo(() => {
    const rows: HeaderRow[] = [
      { name: 'Access-Control-Allow-Origin', value: effectiveOrigin },
      { name: 'Access-Control-Allow-Methods', value: allowMethodsValue },
    ];

    if (requestHeadersDisplay.length) {
      rows.push({
        name: 'Access-Control-Allow-Headers',
        value: requestHeadersDisplay.join(', '),
      });
    }

    if (exposeHeadersDisplay.length) {
      rows.push({
        name: 'Access-Control-Expose-Headers',
        value: exposeHeadersDisplay.join(', '),
      });
    }

    rows.push({
      name: 'Access-Control-Max-Age',
      value: maxAgeSeconds > 0 ? `${maxAgeSeconds}` : '0 (no caching)',
    });

    rows.push({ name: 'Vary', value: varyHeaderValue });

    if (includeCredentials) {
      rows.push({ name: 'Access-Control-Allow-Credentials', value: 'true' });
    } else {
      rows.push({
        name: 'Access-Control-Allow-Credentials',
        value: 'omitted (defaults to false)',
        muted: true,
      });
    }

    return rows;
  }, [
    effectiveOrigin,
    allowMethodsValue,
    requestHeadersDisplay,
    exposeHeadersDisplay,
    maxAgeSeconds,
    varyHeaderValue,
    includeCredentials,
  ]);

  const simpleRequestOutput = useMemo(() => {
    const headerLines = requestHeadersDisplay.map((header) => `    '${header}': '...'`);
    const headerSection = headerLines.length
      ? `  headers: {\n${headerLines.join('\n')}\n  },\n`
      : '';

    return `fetch('${resolvedUrl.href}', {\n  method: '${method.toUpperCase()}',\n${headerSection}  credentials: '${
      includeCredentials ? 'include' : 'omit'
    }',\n});`;
  }, [requestHeadersDisplay, resolvedUrl.href, method, includeCredentials]);

  const preflightPreview = useMemo(() => {
    const lines = [
      `OPTIONS ${resolvedUrl.pathname || '/'} HTTP/1.1`,
      `Host: ${resolvedUrl.host}`,
      `Origin: ${effectiveOrigin}`,
      `Access-Control-Request-Method: ${method.toUpperCase()}`,
    ];
    if (requestHeadersLower.length) {
      lines.push(`Access-Control-Request-Headers: ${requestHeadersLower.join(', ')}`);
    }
    lines.push(
      includeCredentials
        ? '// Credentials mode: include (cookies or Authorization headers on follow-up request)'
        : '// Credentials mode: omit (no cookies sent with follow-up request)',
    );
    return lines.filter(Boolean).join('\n');
  }, [resolvedUrl, effectiveOrigin, method, requestHeadersLower, includeCredentials]);

  const curlCommand = useMemo(() => {
    const fragments = [
      `curl -X ${method.toUpperCase()}`,
      `'${resolvedUrl.href}'`,
      `-H 'Origin: ${effectiveOrigin}'`,
    ];
    requestHeadersDisplay.forEach((header) => {
      fragments.push(`-H '${header}: ...'`);
    });
    if (includeCredentials) {
      fragments.push("--cookie 'session=demo'");
    }
    return fragments.join(' \\\n  ');
  }, [method, resolvedUrl.href, effectiveOrigin, requestHeadersDisplay, includeCredentials]);

  const cacheHint = useMemo(() => {
    if (maxAgeSeconds <= 0) {
      return includeCredentials
        ? 'Preflight will run before every credentialed request because Access-Control-Max-Age is 0.'
        : 'Preflight requests run on every call because Access-Control-Max-Age is 0.';
    }

    if (includeCredentials) {
      return `Browsers keep the preflight for ${maxAgeSeconds} seconds but scope it per origin and user because credentials are allowed.`;
    }

    if (cacheScope === 'public') {
      return `Shared caches can reuse the preflight response for ${maxAgeSeconds} seconds. Ensure Vary: ${varyHeaderValue} is present.`;
    }

    return `The browser may reuse the preflight for ${maxAgeSeconds} seconds for the requesting origin.`;
  }, [maxAgeSeconds, includeCredentials, cacheScope, varyHeaderValue]);

  const warnings = useMemo(() => {
    const unique = new Set<string>();
    if (autoOriginMessage && includeCredentials) unique.add(autoOriginMessage);
    if (cacheScopeMessage && includeCredentials) unique.add(cacheScopeMessage);
    if (includeCredentials)
      unique.add('Remember to return Access-Control-Allow-Credentials: true with explicit origins.');
    if (originSelection === 'custom' && !customOrigin.trim()) {
      unique.add('Enter a custom origin so the previews match the requesting site.');
    }
    return Array.from(unique);
  }, [
    autoOriginMessage,
    cacheScopeMessage,
    includeCredentials,
    originSelection,
    customOrigin,
  ]);

  return (
    <div className="h-full overflow-auto bg-gray-900 p-4 text-white space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">HTTP Request Builder</h1>
        <p className="mt-1 text-sm text-yellow-300">
          Prototype CORS responses without sending network traffic. Adjust origins, cache hints, and
          credentials to see how browsers react.
        </p>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 lg:grid-cols-2"
        aria-label="CORS configuration"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Request details</h2>
          <div>
            <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
              Method
            </label>
            <select
              id="http-method"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={method}
              onChange={(e) => setMethod(e.target.value as CorsMethod)}
            >
              {METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
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
              placeholder={DEFAULT_URL}
            />
          </div>
          <div>
            <label htmlFor="http-allowed-headers" className="mb-1 block text-sm font-medium">
              Request headers (comma separated)
            </label>
            <input
              id="http-allowed-headers"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={allowedHeaders}
              onChange={(e) => setAllowedHeaders(e.target.value)}
              placeholder="Content-Type, Authorization"
            />
          </div>
          <div>
            <label htmlFor="http-allowed-methods" className="mb-1 block text-sm font-medium">
              Access-Control-Allow-Methods
            </label>
            <input
              id="http-allowed-methods"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={allowedMethods}
              onChange={(e) => setAllowedMethods(e.target.value)}
              placeholder="GET, POST, OPTIONS"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">CORS response</h2>
          <div>
            <label htmlFor="cors-origin" className="mb-1 block text-sm font-medium">
              Access-Control-Allow-Origin
            </label>
            <select
              id="cors-origin"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={originSelection}
              onChange={(e) => setOriginSelection(e.target.value)}
            >
              {ORIGIN_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value === 'wildcard' && includeCredentials}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {originSelection === 'custom' && (
              <div className="mt-2 space-y-1">
                <label htmlFor="cors-custom-origin" className="sr-only">
                  Custom origin
                </label>
                <input
                  id="cors-custom-origin"
                  type="text"
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  placeholder="https://client.example"
                />
                {!customOrigin.trim() && (
                  <p className="text-xs text-yellow-300">
                    Enter a custom origin so the previews match the requesting site.
                  </p>
                )}
              </div>
            )}
            {includeCredentials && autoOriginMessage && (
              <p className="mt-2 text-xs text-yellow-300">{autoOriginMessage}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cors-credentials"
              type="checkbox"
              className="h-4 w-4"
              checked={includeCredentials}
              onChange={(e) => setIncludeCredentials(e.target.checked)}
            />
            <label htmlFor="cors-credentials" className="text-sm">
              Allow credentials (cookies, Authorization headers)
            </label>
          </div>
          <div>
            <label htmlFor="cors-expose" className="mb-1 block text-sm font-medium">
              Access-Control-Expose-Headers
            </label>
            <input
              id="cors-expose"
              type="text"
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              value={exposedHeaders}
              onChange={(e) => setExposedHeaders(e.target.value)}
              placeholder="X-Request-Id"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cors-max-age" className="mb-1 block text-sm font-medium">
                Access-Control-Max-Age (seconds)
              </label>
              <input
                id="cors-max-age"
                type="number"
                min={0}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cors-cache-scope" className="mb-1 block text-sm font-medium">
                Cache scope
              </label>
              <select
                id="cors-cache-scope"
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
                value={cacheScope}
                onChange={(e) => setCacheScope(e.target.value as 'public' | 'private')}
              >
                <option value="public" disabled={includeCredentials}>
                  Public (shared caches)
                </option>
                <option value="private">Private (per origin)</option>
              </select>
              {includeCredentials && cacheScopeMessage && (
                <p className="mt-2 text-xs text-yellow-300">{cacheScopeMessage}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Allow headers: {allowHeadersValue} · Expose headers: {exposeHeadersValue}
          </p>
        </div>
      </form>

      {warnings.length > 0 && (
        <div className="rounded border border-yellow-600 bg-yellow-900/40 p-4 text-sm text-yellow-100">
          <p className="font-semibold text-yellow-200">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Simple request output</h2>
            <pre className="overflow-auto rounded bg-black p-3 font-mono text-sm text-green-400">
              {simpleRequestOutput}
            </pre>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Preflight preview</h2>
            <pre className="overflow-auto rounded bg-black p-3 font-mono text-sm text-green-400">
              {preflightPreview}
            </pre>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Command preview</h2>
            <pre className="overflow-auto rounded bg-black p-3 font-mono text-sm text-green-400">
              {curlCommand}
            </pre>
          </section>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Computed response headers</h2>
            <table className="w-full text-sm">
              <tbody>
                {computedHeaders.map((row) => (
                  <tr key={row.name} className="odd:bg-gray-800">
                    <td className="w-1/3 p-2 font-mono">{row.name}</td>
                    <td
                      className={`p-2 font-mono break-all ${
                        row.muted ? 'text-gray-400 italic' : 'text-green-200'
                      }`}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Cache behavior</h2>
            <div className="rounded bg-gray-800 p-3 text-sm text-gray-200">
              <p>{cacheHint}</p>
              {!includeCredentials && cacheScope === 'public' && (
                <p className="mt-2 text-xs text-gray-400">
                  Shared caches honor Access-Control-Max-Age but require Vary: {varyHeaderValue}.
                </p>
              )}
            </div>
          </section>
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
