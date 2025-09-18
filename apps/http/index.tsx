'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';

type OriginPreset = {
  id: string;
  label: string;
  origin: string;
};

type RequestScenario = {
  id: string;
  label: string;
  type: 'preflight' | 'simple';
  method: string;
  path: string;
  description: string;
  allowList: string[];
  requestHeaders?: string[];
  accessControlRequestHeaders?: string[];
};

type SimulationResult = {
  requestLines: string[];
  responseLines: string[];
  blocked: boolean;
  note: string;
  scenario: RequestScenario;
  origin: OriginPreset;
};

const ORIGIN_PRESETS: OriginPreset[] = [
  {
    id: 'internal',
    label: 'Internal app (https://app.internal.local)',
    origin: 'https://app.internal.local',
  },
  {
    id: 'staging',
    label: 'Staging portal (https://staging.partner-demo.com)',
    origin: 'https://staging.partner-demo.com',
  },
  {
    id: 'partner',
    label: 'Partner integration (https://integrations.partner.io)',
    origin: 'https://integrations.partner.io',
  },
];

const SCENARIOS: RequestScenario[] = [
  {
    id: 'preflight-upload',
    label: 'Preflight • PUT /api/upload',
    type: 'preflight',
    method: 'PUT',
    path: '/api/upload',
    description: 'Uploads JSON artifacts that require a custom signing header.',
    allowList: ['internal', 'partner'],
    accessControlRequestHeaders: ['content-type', 'x-demo-signature'],
  },
  {
    id: 'preflight-admin',
    label: 'Preflight • DELETE /api/admin',
    type: 'preflight',
    method: 'DELETE',
    path: '/api/admin',
    description: 'Administrative delete requiring an Authorization bearer token.',
    allowList: ['internal'],
    accessControlRequestHeaders: ['authorization'],
  },
  {
    id: 'preflight-metrics',
    label: 'Preflight • PATCH /api/metrics',
    type: 'preflight',
    method: 'PATCH',
    path: '/api/metrics',
    description: 'Patch metrics payload from a trusted staging origin.',
    allowList: ['internal', 'staging'],
    accessControlRequestHeaders: ['content-type'],
  },
  {
    id: 'simple-status',
    label: 'Simple • GET /status',
    type: 'simple',
    method: 'GET',
    path: '/status',
    description: 'JSON health check that qualifies as a simple GET request.',
    allowList: ['internal', 'staging', 'partner'],
    requestHeaders: ['Accept: application/json'],
  },
  {
    id: 'simple-form',
    label: 'Simple • POST /contact',
    type: 'simple',
    method: 'POST',
    path: '/contact',
    description: 'Form submission encoded as application/x-www-form-urlencoded.',
    allowList: ['internal', 'partner'],
    requestHeaders: ['Content-Type: application/x-www-form-urlencoded'],
  },
];

const resolveOrigin = (id: string): string => {
  const preset = ORIGIN_PRESETS.find((p) => p.id === id);
  return preset ? preset.origin : id;
};

const formatAllowedOrigins = (allowList: string[]): string => {
  if (allowList.length === 0) return 'None';
  return allowList.map(resolveOrigin).join(', ');
};

const runSimulation = (origin: OriginPreset, scenario: RequestScenario): SimulationResult => {
  const allowed = scenario.allowList.includes(origin.id);
  const requestLines: string[] =
    scenario.type === 'preflight'
      ? [
          `OPTIONS ${scenario.path}`,
          `Origin: ${origin.origin}`,
          `Access-Control-Request-Method: ${scenario.method}`,
          `Access-Control-Request-Headers: ${
            scenario.accessControlRequestHeaders && scenario.accessControlRequestHeaders.length
              ? scenario.accessControlRequestHeaders.join(', ')
              : 'none'
          }`,
        ]
      : [
          `${scenario.method} ${scenario.path}`,
          `Origin: ${origin.origin}`,
          ...(scenario.requestHeaders ?? []),
        ];

  let responseLines: string[];
  let note: string;

  if (allowed) {
    if (scenario.type === 'preflight') {
      const allowHeaders =
        scenario.accessControlRequestHeaders && scenario.accessControlRequestHeaders.length
          ? scenario.accessControlRequestHeaders.join(', ')
          : 'none';
      responseLines = [
        'HTTP/1.1 204 No Content',
        `Access-Control-Allow-Origin: ${origin.origin}`,
        `Access-Control-Allow-Methods: ${scenario.method}`,
        `Access-Control-Allow-Headers: ${allowHeaders}`,
        'Access-Control-Max-Age: 600',
        'Vary: Origin',
      ];
      note = `Preflight permitted for ${scenario.method} ${scenario.path}.`;
    } else {
      responseLines = [
        'HTTP/1.1 200 OK',
        `Access-Control-Allow-Origin: ${origin.origin}`,
        'Vary: Origin',
        'Cache-Control: max-age=60',
      ];
      note = `Simple request permitted for ${scenario.method} ${scenario.path}.`;
    }
  } else {
    responseLines = [
      'BLOCKED: CORS policy rejected the request.',
      `Requested Origin: ${origin.origin}`,
      `Allowed Origins: ${formatAllowedOrigins(scenario.allowList)}`,
    ];
    note = `Request blocked by the simulated CORS policy for ${scenario.method} ${scenario.path}.`;
  }

  return {
    requestLines,
    responseLines,
    blocked: !allowed,
    note,
    scenario,
    origin,
  };
};

const updateWindowTimerMetric = (count: number) => {
  if (typeof window === 'undefined') return;
  (window as any).__httpTesterTimers = count;
};

const CurlBuilder: React.FC = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const command = `curl -X ${method} ${url}`.trim();

  return (
    <section className="space-y-4">
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
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4" aria-label="curl command builder">
        <label htmlFor="http-method" className="block text-sm">
          <span className="mb-1 block font-medium">Method</span>
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
        </label>
        <label htmlFor="http-url" className="block text-sm">
          <span className="mb-1 block font-medium">URL</span>
          <input
            id="http-url"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Request URL"
          />
        </label>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400" data-testid="curl-preview">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
    </section>
  );
};

export const RequestTester: React.FC = () => {
  const [originId, setOriginId] = useState(ORIGIN_PRESETS[0].id);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const timersRef = useRef<Set<number>>(new Set());
  const activeTimer = useRef<number | null>(null);

  const updateInstrumentation = useCallback(() => {
    updateWindowTimerMetric(timersRef.current.size);
  }, []);

  useEffect(() => {
    updateInstrumentation();
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      updateInstrumentation();
    };
  }, [updateInstrumentation]);

  const origin = useMemo(
    () => ORIGIN_PRESETS.find((preset) => preset.id === originId) ?? ORIGIN_PRESETS[0],
    [originId],
  );
  const scenario = useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  const run = useCallback(() => {
    if (!origin || !scenario) return;

    if (activeTimer.current !== null) {
      clearTimeout(activeTimer.current);
      timersRef.current.delete(activeTimer.current);
      activeTimer.current = null;
    }

    const execute = () => {
      const simulation = runSimulation(origin, scenario);
      setResult(simulation);
      setLoading(false);
      if (activeTimer.current !== null) {
        timersRef.current.delete(activeTimer.current);
        activeTimer.current = null;
      }
      updateInstrumentation();
    };

    if (typeof window === 'undefined') {
      execute();
      return;
    }

    setLoading(true);
    setResult(null);
    const timer = window.setTimeout(execute, 150);
    activeTimer.current = timer;
    timersRef.current.add(timer);
    updateInstrumentation();
  }, [origin, scenario, updateInstrumentation]);

  return (
    <div aria-label="cors simulation toolkit" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">CORS Preflight Simulator</h2>
        <p className="text-sm text-gray-300">
          Explore how origin presets impact preflight and simple requests. All simulations run locally without
          network access.
        </p>
      </div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 md:grid-cols-2"
        aria-label="request simulation form"
      >
        <label className="flex flex-col text-sm" htmlFor="origin-preset">
          <span className="mb-1 font-medium">Origin preset</span>
          <select
            id="origin-preset"
            className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
          >
            {ORIGIN_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm" htmlFor="scenario-select">
          <span className="mb-1 font-medium">Scenario</span>
          <select
            id="scenario-select"
            className="rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
          >
            {SCENARIOS.map((scn) => (
              <option key={scn.id} value={scn.id}>
                {scn.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2 flex flex-col gap-2 text-xs text-gray-300 md:flex-row md:items-center md:justify-between">
          <span>{scenario.description}</span>
          <button
            type="button"
            onClick={run}
            className="self-start rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Run simulation
          </button>
        </div>
      </form>
      <div>
        <h3 className="text-lg font-semibold mb-2">Request Preview</h3>
        <pre
          data-testid="request-preview"
          className="min-h-[96px] whitespace-pre-wrap rounded border border-gray-800 bg-black p-3 font-mono text-sm text-green-300"
        >
          {result
            ? result.requestLines.join('\n')
            : 'Select an origin and scenario, then run the simulation to view the synthetic request.'}
        </pre>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">Response Preview</h3>
        <pre
          data-testid="response-preview"
          className="min-h-[96px] whitespace-pre-wrap rounded border border-gray-800 bg-black p-3 font-mono text-sm text-cyan-200"
        >
          {loading
            ? 'Simulating response…'
            : result
            ? result.responseLines.join('\n')
            : 'Run a simulation to inspect the synthetic response headers.'}
        </pre>
      </div>
      {result && (
        <div
          data-testid="result-status"
          className={`rounded border px-3 py-2 text-sm ${
            result.blocked ? 'border-red-500 text-red-300' : 'border-green-500 text-green-300'
          }`}
        >
          <strong>{result.blocked ? 'Blocked' : 'Allowed'}.</strong> {result.note}
        </div>
      )}
    </div>
  );
};

const HTTPBuilder: React.FC = () => (
  <div className="h-full bg-gray-900 p-4 text-white overflow-auto space-y-8">
    <CurlBuilder />
    <section className="rounded border border-gray-800 bg-gray-950 p-4">
      <RequestTester />
    </section>
  </div>
);

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
