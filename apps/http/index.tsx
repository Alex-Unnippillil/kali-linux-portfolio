'use client';

import React, { useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type ServerMode = 'wildcard' | 'exact' | 'null';

interface HeaderLine {
  name: string;
  value: string;
}

interface ServerConfig {
  id: string;
  label: string;
  mode: ServerMode;
  description: string;
  headers: HeaderLine[];
  allowedOrigins?: string[];
}

interface OriginScenario {
  id: string;
  serverId: string;
  origin: string;
}

const ORIGIN_STORAGE_KEY = 'http:origin-tester:scenarios';

const generateScenarioId = () =>
  `scenario-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const SERVER_CONFIGS: ServerConfig[] = [
  {
    id: 'wildcard',
    label: 'Public API (wildcard)',
    mode: 'wildcard',
    description:
      'Access-Control-Allow-Origin is set to * with credentials disabled. Suitable for public, stateless APIs.',
    headers: [
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Credentials', value: 'false' },
    ],
  },
  {
    id: 'exact',
    label: 'Trusted portal (exact match)',
    mode: 'exact',
    description:
      'Allows a specific origin and supports credentials. The allow list is limited to first-party portals.',
    headers: [
      { name: 'Access-Control-Allow-Origin', value: 'https://portal.example.com' },
      { name: 'Access-Control-Allow-Credentials', value: 'true' },
    ],
    allowedOrigins: ['https://portal.example.com', 'https://admin.example.com'],
  },
  {
    id: 'null',
    label: 'Sandboxed iframe (Origin: null)',
    mode: 'null',
    description:
      'Only accepts opaque/null origins such as local files or sandboxed iframes. Requests with named origins are rejected.',
    headers: [
      { name: 'Access-Control-Allow-Origin', value: 'null' },
      { name: 'Access-Control-Allow-Credentials', value: 'false' },
    ],
  },
];

const createScenario = (
  serverId: string = SERVER_CONFIGS[0].id,
  origin = '',
  id: string = generateScenarioId(),
): OriginScenario => ({
  id,
  serverId,
  origin,
});

const DEFAULT_SCENARIOS: OriginScenario[] = [
  createScenario('wildcard', 'https://app.example.com'),
  createScenario('exact', 'https://portal.example.com'),
  createScenario('null', 'null'),
];

const parseStoredScenarios = (raw: string | null): OriginScenario[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const sanitized: OriginScenario[] = [];
    parsed.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const data = item as Partial<OriginScenario>;
      const storedServer = typeof data.serverId === 'string' ? data.serverId : SERVER_CONFIGS[0].id;
      const serverExists = SERVER_CONFIGS.some((cfg) => cfg.id === storedServer);
      const serverId = serverExists ? storedServer : SERVER_CONFIGS[0].id;
      const origin = typeof data.origin === 'string' ? data.origin : '';
      const id = typeof data.id === 'string' ? data.id : generateScenarioId();
      sanitized.push(createScenario(serverId, origin, id));
    });
    return sanitized.length ? sanitized : null;
  } catch {
    return null;
  }
};

interface ScenarioResult {
  allowed: boolean;
  message: string;
}

const evaluateScenario = (originInput: string, config: ServerConfig): ScenarioResult => {
  const trimmed = originInput.trim();
  if (!trimmed) {
    return {
      allowed: false,
      message: 'Enter an origin to see how the policy responds.',
    };
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'null') {
    if (config.mode === 'wildcard' || config.mode === 'null') {
      return {
        allowed: true,
        message:
          config.mode === 'null'
            ? 'Server explicitly allows null/opaque origins such as sandboxed iframes.'
            : 'Wildcard policy accepts null origins.',
      };
    }
    return {
      allowed: false,
      message: 'Server rejects null or opaque origins.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      allowed: false,
      message: 'Invalid origin. Include the protocol (e.g. https://example.com).',
    };
  }

  const normalized = parsed.origin;
  const isOpaque = normalized === 'null';

  if (isOpaque) {
    if (config.mode === 'wildcard' || config.mode === 'null') {
      return {
        allowed: true,
        message:
          config.mode === 'null'
            ? 'Opaque origins (file://, data:) are permitted.'
            : 'Wildcard policy also covers opaque origins.',
      };
    }
    return {
      allowed: false,
      message: 'Server rejects opaque origins such as file://.',
    };
  }

  if (config.mode === 'wildcard') {
    return {
      allowed: true,
      message: 'Wildcard policy allows any fully-qualified origin.',
    };
  }

  if (config.mode === 'null') {
    return {
      allowed: false,
      message: 'Server only allows null/opaque origins such as sandboxed frames or local files.',
    };
  }

  const allowList = (config.allowedOrigins ?? []).map((origin) => origin.toLowerCase());
  if (allowList.includes(normalized.toLowerCase())) {
    return {
      allowed: true,
      message: 'Origin matches the configured allow list.',
    };
  }

  const readableList = config.allowedOrigins?.join(', ') || 'configured allow list';
  return {
    allowed: false,
    message: `Origin not on allow list. Allowed origins: ${readableList}.`,
  };
};

const CorsOriginTester: React.FC = () => {
  const [scenarios, setScenarios] = useState<OriginScenario[]>(() =>
    DEFAULT_SCENARIOS.map((scenario) => ({ ...scenario })),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = parseStoredScenarios(window.localStorage.getItem(ORIGIN_STORAGE_KEY));
    if (saved) setScenarios(saved);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serializable = scenarios.map(({ id, serverId, origin }) => ({ id, serverId, origin }));
    window.localStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(serializable));
  }, [scenarios]);

  const updateScenario = (id: string, updates: Partial<Pick<OriginScenario, 'serverId' | 'origin'>>) => {
    setScenarios((prev) =>
      prev.map((scenario) =>
        scenario.id === id
          ? {
              ...scenario,
              ...updates,
            }
          : scenario,
      ),
    );
  };

  const addScenario = () => {
    setScenarios((prev) => [...prev, createScenario()]);
  };

  const removeScenario = (id: string) => {
    setScenarios((prev) => prev.filter((scenario) => scenario.id !== id));
  };

  return (
    <section className="mt-8 rounded border border-gray-800 bg-gray-900/70 p-4">
      <h2 className="text-lg font-semibold">CORS Origin Tester</h2>
      <p className="mt-1 text-sm text-gray-300">
        Compare how different Access-Control-Allow-Origin responses treat your origins. All checks are simulated locally.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-300">
              <th scope="col" className="p-2">
                Server policy
              </th>
              <th scope="col" className="p-2">
                Origin to test
              </th>
              <th scope="col" className="p-2">
                Result
              </th>
              <th scope="col" className="p-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario, index) => {
              const config =
                SERVER_CONFIGS.find((cfg) => cfg.id === scenario.serverId) ?? SERVER_CONFIGS[0];
              const result = evaluateScenario(scenario.origin, config);
              return (
                <tr
                  key={scenario.id}
                  className={index % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}
                >
                  <td className="p-2 align-top">
                    <select
                      id={`server-${scenario.id}`}
                      aria-label="Server policy"
                      className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white"
                      value={scenario.serverId}
                      onChange={(e) => updateScenario(scenario.id, { serverId: e.target.value })}
                    >
                      {SERVER_CONFIGS.map((cfg) => (
                        <option key={cfg.id} value={cfg.id}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 space-y-1 text-xs text-gray-400">
                      {config.headers.map((header) => (
                        <div key={header.name} className="font-mono">
                          {header.name}: {header.value}
                        </div>
                      ))}
                      <div>{config.description}</div>
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    <input
                      id={`origin-${scenario.id}`}
                      type="text"
                      aria-label="Origin to test"
                      className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white"
                      placeholder="https://app.example.com"
                      value={scenario.origin}
                      onChange={(e) => updateScenario(scenario.id, { origin: e.target.value })}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <div
                      className={
                        result.allowed
                          ? 'font-semibold text-green-400'
                          : 'font-semibold text-red-400'
                      }
                    >
                      {result.allowed ? 'Allowed' : 'Blocked'}
                    </div>
                    <p
                      className={`mt-1 text-xs ${result.allowed ? 'text-gray-300' : 'text-red-300'}`}
                    >
                      {result.message}
                    </p>
                  </td>
                  <td className="p-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => removeScenario(scenario.id)}
                      className="text-xs text-gray-300 underline transition hover:text-white"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {scenarios.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-sm text-gray-400">
                  Add an origin scenario to start comparing policies.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addScenario}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-500"
        >
          Add origin scenario
        </button>
      </div>
    </section>
  );
};

const HTTPBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const command = `curl -X ${method} ${url}`.trim();

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
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
      <CorsOriginTester />
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
