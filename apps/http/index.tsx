'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import usePersistentState from '../../hooks/usePersistentState';

const SCENARIO_STORAGE_KEY = 'apps:http:cors-scenario';
const DEMO_MIN_MAX_AGE = 0;
const DEMO_MAX_MAX_AGE = 86400;
const DEFAULT_MAX_AGE = 600;

interface HttpScenario {
  method: string;
  url: string;
  maxAge: number;
}

const DEFAULT_SCENARIO: HttpScenario = {
  method: 'GET',
  url: '',
  maxAge: DEFAULT_MAX_AGE,
};

const isScenario = (value: unknown): value is HttpScenario => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.method === 'string' &&
    typeof record.url === 'string' &&
    typeof record.maxAge === 'number'
  );
};

const clampMaxAge = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_MAX_AGE;
  if (value < DEMO_MIN_MAX_AGE) return DEMO_MIN_MAX_AGE;
  if (value > DEMO_MAX_MAX_AGE) return DEMO_MAX_MAX_AGE;
  return Math.round(value);
};

const clampScenario = (scenario: HttpScenario): HttpScenario => ({
  ...scenario,
  maxAge: clampMaxAge(scenario.maxAge),
});

const scenariosEqual = (a: HttpScenario, b: HttpScenario) =>
  a.method === b.method && a.url === b.url && a.maxAge === b.maxAge;

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return '0 seconds';
  const units = [
    { label: 'day', value: 86400 },
    { label: 'hour', value: 3600 },
    { label: 'minute', value: 60 },
    { label: 'second', value: 1 },
  ];
  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  for (const { label, value } of units) {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      parts.push(`${count} ${label}${count === 1 ? '' : 's'}`);
      remaining -= count * value;
    }
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(', ') : '0 seconds';
};

const deriveOrigin = (input: string) => {
  if (!input) return 'https://example.com';
  try {
    return new URL(input).origin;
  } catch {
    try {
      return new URL(`https://${input}`).origin;
    } catch {
      return 'https://example.com';
    }
  }
};

const buildAllowMethods = (method: string) => {
  const methods = new Set<string>(['OPTIONS']);
  const normalized = method.trim().toUpperCase();
  if (normalized && normalized !== 'OPTIONS') {
    methods.add(normalized);
  }
  return Array.from(methods).join(', ');
};

const HTTPBuilder: React.FC = () => {
  const [scenarioState, setScenarioState] = usePersistentState<HttpScenario>(
    SCENARIO_STORAGE_KEY,
    DEFAULT_SCENARIO,
    isScenario,
  );

  useEffect(() => {
    const normalized = clampScenario(scenarioState);
    if (!scenariosEqual(normalized, scenarioState)) {
      setScenarioState(normalized);
    }
  }, [scenarioState, setScenarioState]);

  const scenario = useMemo(() => clampScenario(scenarioState), [scenarioState]);

  const updateScenario = (updates: Partial<HttpScenario>) => {
    setScenarioState((prev) => clampScenario({ ...prev, ...updates }));
  };

  const { method, url, maxAge } = scenario;
  const command = useMemo(() => `curl -X ${method} ${url}`.trim(), [method, url]);
  const allowOrigin = useMemo(() => deriveOrigin(url), [url]);
  const allowMethods = useMemo(() => buildAllowMethods(method), [method]);
  const expiryDate = maxAge > 0 ? new Date(Date.now() + maxAge * 1000) : null;
  const expiryIso = expiryDate ? expiryDate.toISOString() : null;
  const humanDuration = formatDuration(maxAge);

  const responsePreview = useMemo(() => {
    const lines = [
      'HTTP/1.1 204 No Content',
      `Access-Control-Allow-Origin: ${allowOrigin}`,
      `Access-Control-Allow-Methods: ${allowMethods}`,
      'Access-Control-Allow-Headers: Authorization, Content-Type',
      `Access-Control-Max-Age: ${maxAge}`,
    ];
    if (expiryIso) {
      lines.push(`# Expires at ${expiryIso} (${humanDuration})`);
    } else {
      lines.push('# Max-Age 0 disables caching of the preflight response');
    }
    return lines.join('\n');
  }, [allowMethods, allowOrigin, expiryIso, humanDuration, maxAge]);

  const scenarioJson = useMemo(
    () => JSON.stringify({ method, url, maxAge }, null, 2),
    [method, url, maxAge],
  );

  return (
    <div className="h-full bg-gray-900 p-4 text-white overflow-auto">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Build a CORS preflight demo without sending any live requests. Tuning the
        Access-Control-Max-Age slider updates the response preview and the saved scenario instantly.
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
            onChange={(e) => updateScenario({ method: e.target.value })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
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
            onChange={(e) => updateScenario({ url: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="http-max-age" className="mb-1 block text-sm font-medium">
            Access-Control-Max-Age (seconds)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="http-max-age"
              type="range"
              min={DEMO_MIN_MAX_AGE}
              max={DEMO_MAX_MAX_AGE}
              step={60}
              value={maxAge}
              onChange={(e) => updateScenario({ maxAge: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-20 text-right font-mono">{maxAge}s</span>
          </div>
          <p className="mt-1 text-xs text-gray-300">
            {maxAge > 0
              ? `Cache the preflight for ${humanDuration}. Expires ${expiryIso ?? 'soon'}.`
              : '0 keeps the demo safe by forcing every request to preflight.'}
          </p>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg">Command Preview</h2>
          <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
            {command || '# Fill in the form to generate a command'}
          </pre>
        </div>
        <div>
          <h2 className="mb-2 text-lg">Response Preview</h2>
          <pre className="overflow-auto rounded bg-black p-2 font-mono text-blue-200">
            {responsePreview}
          </pre>
        </div>
      </div>
      <div className="mt-4">
        <h2 className="mb-2 text-lg">Scenario Data</h2>
        <pre className="overflow-auto rounded bg-gray-800 p-2 text-xs">
          {scenarioJson}
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
