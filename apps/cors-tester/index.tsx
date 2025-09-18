'use client';

import React, { useMemo, useState } from 'react';
import PreflightPanel from '../../components/apps/cors-tester/PreflightPanel';

const SIMPLE_METHODS = ['GET', 'HEAD', 'POST'];
const COMPLEX_METHODS = ['PUT', 'PATCH', 'DELETE'];
const SPECIAL_METHODS = ['OPTIONS'];
const BLOCKED_METHODS = ['TRACE', 'TRACK', 'CONNECT'];

const DEFAULT_REQUEST_HEADERS = `Content-Type: application/json\nAuthorization: Bearer <token>`;
const DEFAULT_REQUESTED_HEADERS = 'Content-Type, Authorization';
const DEFAULT_ALLOWED_ORIGINS = 'https://demo-client.app, https://alt-client.app';
const DEFAULT_ORIGIN = 'https://demo-client.app';
const DEFAULT_MAX_AGE = '600';

const parseLines = (raw: string): string[] =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const parseNameList = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const extractHeaderNames = (lines: string[]): string[] =>
  lines
    .map((line) => line.split(':')[0]?.trim() ?? '')
    .filter(Boolean);

const CorsTesterApp: React.FC = () => {
  const [method, setMethod] = useState('POST');
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [allowCredentials, setAllowCredentials] = useState(false);
  const [requestHeadersInput, setRequestHeadersInput] = useState(DEFAULT_REQUEST_HEADERS);
  const [requestedHeadersInput, setRequestedHeadersInput] = useState(DEFAULT_REQUESTED_HEADERS);
  const [allowedOriginsInput, setAllowedOriginsInput] = useState(DEFAULT_ALLOWED_ORIGINS);
  const [maxAgeInput, setMaxAgeInput] = useState(DEFAULT_MAX_AGE);

  const requestHeaderLines = useMemo(
    () => parseLines(requestHeadersInput),
    [requestHeadersInput],
  );
  const requestHeaderNames = useMemo(
    () => extractHeaderNames(requestHeaderLines),
    [requestHeaderLines],
  );
  const requestedHeaderNames = useMemo(
    () => parseNameList(requestedHeadersInput),
    [requestedHeadersInput],
  );
  const allowedOrigins = useMemo(
    () => parseNameList(allowedOriginsInput),
    [allowedOriginsInput],
  );

  const { maxAgeSeconds, maxAgeError, usingDefaultMaxAge } = useMemo(() => {
    const trimmed = maxAgeInput.trim();
    if (trimmed.length === 0) {
      return { maxAgeSeconds: Number.parseInt(DEFAULT_MAX_AGE, 10), maxAgeError: null, usingDefaultMaxAge: true };
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { maxAgeSeconds: Number.parseInt(DEFAULT_MAX_AGE, 10), maxAgeError: 'Enter a non-negative integer.', usingDefaultMaxAge: true };
    }
    return { maxAgeSeconds: parsed, maxAgeError: null, usingDefaultMaxAge: false };
  }, [maxAgeInput]);

  return (
    <div className="h-full w-full overflow-auto bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-sky-200">CORS Preflight Tester</h1>
          <p className="text-sm text-slate-300">
            Experiment with request methods and headers to see how a mock server would build its <code>Access-Control-*</code> response.{' '}
            Everything stays in the browser—no network calls are made.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form
            className="space-y-6 rounded border border-slate-800 bg-slate-900/70 p-4 shadow-lg backdrop-blur"
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Request
              </legend>
              <div className="space-y-2">
                <label htmlFor="cors-method" className="block text-sm font-medium text-slate-200">
                  Actual request method
                </label>
                <select
                  id="cors-method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 text-slate-100 focus:border-sky-400 focus:outline-none"
                >
                  <optgroup label="Simple">
                    {SIMPLE_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Preflighted">
                    {COMPLEX_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Special">
                    {SPECIAL_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {value} (preflight verb)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Blocked">
                    {BLOCKED_METHODS.map((value) => (
                      <option key={value} value={value}>
                        {value} (blocked)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-slate-400">
                  The preflight response should mirror this value inside <code>Access-Control-Allow-Methods</code> when it is permitted.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="cors-origin" className="block text-sm font-medium text-slate-200">
                  Request Origin header
                </label>
                <input
                  id="cors-origin"
                  type="text"
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  placeholder="https://demo-client.app"
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 text-slate-100 focus:border-sky-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Enter the origin of the calling site. The preview will show whether it matches the allowed list.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="cors-request-headers" className="block text-sm font-medium text-slate-200">
                  Actual request headers
                </label>
                <textarea
                  id="cors-request-headers"
                  value={requestHeadersInput}
                  onChange={(event) => setRequestHeadersInput(event.target.value)}
                  rows={5}
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Provide one header per line using the <code>Name: value</code> format. Headers such as <code>Cookie</code> will be rejected by browsers.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="cors-requested-headers" className="block text-sm font-medium text-slate-200">
                  <code>Access-Control-Request-Headers</code>
                </label>
                <textarea
                  id="cors-requested-headers"
                  value={requestedHeadersInput}
                  onChange={(event) => setRequestedHeadersInput(event.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  placeholder="Content-Type, Authorization"
                />
                <p className="text-xs text-slate-400">
                  Separate names with commas or newlines. The preview highlights non-simple headers that need to be echoed back.
                </p>
              </div>
            </fieldset>
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-slate-400">Policy</legend>
              <div className="space-y-2">
                <label htmlFor="cors-allowed-origins" className="block text-sm font-medium text-slate-200">
                  Allowed origins
                </label>
                <textarea
                  id="cors-allowed-origins"
                  value={allowedOriginsInput}
                  onChange={(event) => setAllowedOriginsInput(event.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  placeholder="https://demo-client.app, https://alt-client.app"
                />
                <p className="text-xs text-slate-400">
                  Provide a comma or newline separated list. Use <code>*</code> to allow any origin.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="cors-credentials" className="flex items-center gap-3 text-sm font-medium text-slate-200">
                  <input
                    id="cors-credentials"
                    type="checkbox"
                    checked={allowCredentials}
                    onChange={(event) => setAllowCredentials(event.target.checked)}
                    className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-sky-400 focus:ring-2 focus:ring-sky-500"
                  />
                  Allow credentials
                </label>
                <p className="text-xs text-slate-400">
                  Required for cookies or Authorization headers. The preview warns when paired with a wildcard origin.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="cors-max-age" className="block text-sm font-medium text-slate-200">
                  <code>Access-Control-Max-Age</code> (seconds)
                </label>
                <input
                  id="cors-max-age"
                  type="number"
                  min={0}
                  value={maxAgeInput}
                  onChange={(event) => setMaxAgeInput(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950/60 p-2 text-slate-100 focus:border-sky-400 focus:outline-none"
                />
                <p className="text-xs text-slate-400">
                  Controls how long the browser can cache a successful preflight. Values above 86,400 seconds are clamped.
                </p>
                {maxAgeError && <p className="text-xs text-rose-400">{maxAgeError}</p>}
                {usingDefaultMaxAge && !maxAgeError && (
                  <p className="text-xs text-slate-500">
                    Empty input uses the default of {DEFAULT_MAX_AGE} seconds.
                  </p>
                )}
              </div>
            </fieldset>
          </form>
          <div className="space-y-6">
            <PreflightPanel
              method={method}
              origin={origin}
              requestHeaders={requestHeaderLines}
              requestedHeaders={requestedHeaderNames}
              allowCredentials={allowCredentials}
              maxAgeSeconds={maxAgeSeconds}
              allowedOrigins={allowedOrigins}
            />
            <section className="rounded border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              <h2 className="mb-3 text-base font-semibold text-slate-200">Normalized inputs</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Actual request headers</p>
                  <ul className="mt-1 space-y-1 font-mono text-xs text-slate-100">
                    {requestHeaderNames.length > 0 ? (
                      requestHeaderNames.map((name) => <li key={name}>{name}</li>)
                    ) : (
                      <li className="text-slate-500">— none —</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Access-Control-Request-Headers</p>
                  <ul className="mt-1 space-y-1 font-mono text-xs text-slate-100">
                    {requestedHeaderNames.length > 0 ? (
                      requestedHeaderNames.map((name) => <li key={name}>{name}</li>)
                    ) : (
                      <li className="text-slate-500">— none —</li>
                    )}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                These derived lists are sent to the preview component. Adjusting them updates the mock response immediately.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorsTesterApp;
