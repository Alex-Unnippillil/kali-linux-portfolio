'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DirectiveConfig = {
  name: string;
  sources: string;
  description?: string;
};

type ViolationPayload = Record<string, unknown>;

type ViolationLogEntry = {
  id: string;
  directive: string;
  origin: string;
  blockedURI: string;
  documentURI: string;
  timestamp: number;
  disposition: string;
  raw: ViolationPayload;
};

type ViolationGroup = {
  key: string;
  directive: string;
  origin: string;
  count: number;
  lastTimestamp: number;
  entries: ViolationLogEntry[];
};

const DEFAULT_POLICY: DirectiveConfig[] = [
  {
    name: 'default-src',
    sources: "'self'",
    description: 'Baseline fallback for directives not explicitly set.',
  },
  {
    name: 'script-src',
    sources: "'self' https://cdn.example.com",
    description: 'Allow trusted scripts while blocking unexpected inline code.',
  },
  {
    name: 'style-src',
    sources: "'self' 'unsafe-inline'",
    description: 'Inline styles are allowed for the demo; tighten for production.',
  },
  {
    name: 'img-src',
    sources: "'self' data:",
    description: 'Permit same-origin images and inline data URIs.',
  },
  {
    name: 'connect-src',
    sources: "'self' https://api.example.com",
    description: 'Restrict XHR/WebSocket destinations to the application API.',
  },
  {
    name: 'frame-src',
    sources: "'self' https://widgets.example.net",
    description: 'Only allow embedding trusted dashboards.',
  },
];

const SAMPLE_VIOLATIONS: readonly ViolationPayload[] = [
  {
    effectiveDirective: 'script-src',
    blockedURI: 'https://malicious.cdn.example/app.js',
    documentURI: 'https://demo.internal/dashboard',
    disposition: 'enforce',
    sourceFile: 'https://demo.internal/dashboard.js',
    lineNumber: 87,
    columnNumber: 16,
    statusCode: 200,
  },
  {
    effectiveDirective: 'img-src',
    blockedURI: 'https://ads.tracker.example/pixel.gif',
    documentURI: 'https://demo.internal/reports',
    disposition: 'report',
    sourceFile: 'https://demo.internal/reports',
    lineNumber: 0,
    columnNumber: 0,
    referrer: 'https://demo.internal/reports',
  },
  {
    effectiveDirective: 'connect-src',
    blockedURI: 'https://api.thirdparty.dev/metrics',
    documentURI: 'https://demo.internal/analytics',
    disposition: 'enforce',
    sourceFile: 'https://demo.internal/analytics.js',
    lineNumber: 142,
    columnNumber: 9,
  },
  {
    effectiveDirective: 'style-src',
    blockedURI: 'https://fast.styles.example/main.css',
    documentURI: 'https://demo.internal/settings',
    disposition: 'report',
    sourceFile: 'https://demo.internal/settings',
    lineNumber: 0,
    columnNumber: 0,
  },
  {
    effectiveDirective: 'frame-src',
    blockedURI: 'https://widgets.partner.example/dashboard',
    documentURI: 'https://demo.internal/dashboard',
    disposition: 'enforce',
    sourceFile: 'https://demo.internal/dashboard',
    lineNumber: 0,
    columnNumber: 0,
  },
  {
    effectiveDirective: 'script-src',
    blockedURI: 'inline',
    documentURI: 'https://demo.internal/profile',
    disposition: 'enforce',
    sourceFile: 'https://demo.internal/profile',
    lineNumber: 12,
    columnNumber: 21,
  },
] as const;

const MAX_LOG_ENTRIES = 200;

const normalizeDirectiveName = (value: string) => value.trim().toLowerCase();

const deriveOrigin = (uri?: string): string => {
  if (!uri) return 'inline';
  const lower = uri.toLowerCase();
  if (lower === 'self') return "'self'";
  if (lower === 'inline' || lower === 'eval') return lower;
  if (lower.startsWith('data:')) return 'data:';
  if (lower === 'null') return 'null';
  try {
    return new URL(uri).origin;
  } catch {
    return uri;
  }
};

const buildPolicyString = (policy: DirectiveConfig[]) =>
  policy
    .filter((item) => item.name.trim())
    .map((item) => `${item.name.trim()} ${item.sources.trim() || "'none'"}`)
    .join('; ');

const normalizePolicy = (items: DirectiveConfig[]): DirectiveConfig[] => {
  const seen = new Set<string>();
  const cleaned: DirectiveConfig[] = [];
  for (const item of items) {
    const name = normalizeDirectiveName(item.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    cleaned.push({
      name,
      sources: item.sources.trim(),
      description: item.description,
    });
  }
  return cleaned;
};

interface DirectiveEditorProps {
  policy: DirectiveConfig[];
  onApply: (next: DirectiveConfig[]) => void;
}

interface ViolationReporterProps {
  entries: ViolationLogEntry[];
  directiveFilter: string;
  originFilter: string;
  onDirectiveFilterChange: (value: string) => void;
  onOriginFilterChange: (value: string) => void;
  onClear: () => void;
  onSimulate: () => void;
  onSimulateBurst: () => void;
  policyString: string;
  lastPolicyReset: number | null;
}

const DirectiveEditor = ({ policy, onApply }: DirectiveEditorProps) => {
  const [draft, setDraft] = useState<DirectiveConfig[]>(policy);

  useEffect(() => {
    setDraft(policy);
  }, [policy]);

  const updateDraft = useCallback(
    (index: number, field: keyof DirectiveConfig, value: string) => {
      setDraft((prev) =>
        prev.map((entry, i) =>
          i === index
            ? {
                ...entry,
                [field]: value,
              }
            : entry,
        ),
      );
    },
    [],
  );

  const addDirective = useCallback(() => {
    setDraft((prev) => [
      ...prev,
      { name: '', sources: "'self'", description: '' },
    ]);
  }, []);

  const removeDirective = useCallback((index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleApply = useCallback(() => {
    onApply(normalizePolicy(draft));
  }, [draft, onApply]);

  const handleReset = useCallback(() => {
    setDraft(DEFAULT_POLICY);
    onApply(DEFAULT_POLICY);
  }, [onApply]);

  return (
    <section className="space-y-4 rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg">
      <div>
        <h2 className="text-lg font-semibold text-white">Directive Editor</h2>
        <p className="mt-1 text-sm text-gray-300">
          Adjust Content-Security-Policy directives. Applying changes resets the
          violation log so reports always reflect the active policy.
        </p>
      </div>
      <div className="space-y-3">
        {draft.map((directive, index) => (
          <div
            key={`directive-${index}`}
            className="rounded-md border border-gray-700 bg-gray-800 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className="flex flex-col text-sm text-gray-200"
                htmlFor={`directive-name-${index}`}
              >
                Directive {index + 1}
                <input
                  id={`directive-name-${index}`}
                  value={directive.name}
                  onChange={(event) =>
                    updateDraft(index, 'name', event.target.value)
                  }
                  placeholder="e.g. script-src"
                  aria-label={`Directive ${index + 1} name`}
                  className="mt-1 rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white focus:border-ub-orange focus:outline-none"
                />
              </label>
              <label
                className="flex flex-col text-sm text-gray-200"
                htmlFor={`directive-sources-${index}`}
              >
                Allowed sources
                <input
                  id={`directive-sources-${index}`}
                  value={directive.sources}
                  onChange={(event) =>
                    updateDraft(index, 'sources', event.target.value)
                  }
                  placeholder="e.g. 'self' https://cdn.example.com"
                  aria-label={`Directive ${index + 1} sources`}
                  className="mt-1 rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white focus:border-ub-orange focus:outline-none"
                />
              </label>
            </div>
            {directive.description && (
              <p className="mt-2 text-xs text-gray-400">{directive.description}</p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeDirective(index)}
                className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:border-red-500 hover:text-red-300"
                aria-label={`Remove directive ${index + 1}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addDirective}
          className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600"
        >
          Add Directive
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black hover:bg-orange-400"
        >
          Apply Policy
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-gray-500 px-3 py-1 text-sm text-gray-200 hover:border-ub-orange"
        >
          Reset Defaults
        </button>
      </div>
    </section>
  );
};

const ViolationReporter = ({
  entries,
  directiveFilter,
  originFilter,
  onDirectiveFilterChange,
  onOriginFilterChange,
  onClear,
  onSimulate,
  onSimulateBurst,
  policyString,
  lastPolicyReset,
}: ViolationReporterProps) => {
  const directiveOptions = useMemo(() => {
    const set = new Set(entries.map((entry) => entry.directive));
    return Array.from(set).sort();
  }, [entries]);

  const originOptions = useMemo(() => {
    const set = new Set(entries.map((entry) => entry.origin));
    return Array.from(set).sort();
  }, [entries]);

  const groups = useMemo(() => {
    const map = new Map<string, ViolationGroup>();
    for (const entry of entries) {
      const key = `${entry.directive}|${entry.origin}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          directive: entry.directive,
          origin: entry.origin,
          count: 0,
          lastTimestamp: entry.timestamp,
          entries: [],
        });
      }
      const group = map.get(key)!;
      group.count += 1;
      group.entries.push(entry);
      if (entry.timestamp > group.lastTimestamp) {
        group.lastTimestamp = entry.timestamp;
      }
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => b.timestamp - a.timestamp),
    }));
  }, [entries]);

  const filteredGroups = useMemo(
    () =>
      groups
        .filter((group) =>
          directiveFilter !== 'all' && directiveFilter
            ? group.directive === directiveFilter
            : true,
        )
        .filter((group) =>
          originFilter !== 'all' && originFilter
            ? group.origin === originFilter
            : true,
        )
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp),
    [groups, directiveFilter, originFilter],
  );

  const filteredEntries = useMemo(
    () => filteredGroups.flatMap((group) => group.entries),
    [filteredGroups],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedKey(null);
      return;
    }
    if (selectedKey && filteredGroups.some((group) => group.key === selectedKey)) {
      return;
    }
    setSelectedKey(filteredGroups[0].key);
  }, [filteredGroups, selectedKey]);

  const selectedGroup = useMemo(
    () => filteredGroups.find((group) => group.key === selectedKey) ?? null,
    [filteredGroups, selectedKey],
  );

  return (
    <section className="space-y-4 rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Violation Reporter</h2>
          <p className="text-sm text-gray-300">
            Listen for <code>window.postMessage</code> events containing CSP
            violation payloads. Use the filters to focus on specific directives
            or blocked origins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSimulate}
            className="rounded bg-ub-green px-3 py-1 text-sm font-semibold text-black hover:bg-green-400"
          >
            Simulate one
          </button>
          <button
            type="button"
            onClick={onSimulateBurst}
            className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black hover:bg-orange-400"
          >
            Simulate burst
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-gray-500 px-3 py-1 text-sm text-gray-200 hover:border-red-400 hover:text-red-300"
          >
            Clear log
          </button>
        </div>
      </div>
      {lastPolicyReset ? (
        <p className="rounded border border-green-900 bg-green-950 px-3 py-2 text-xs text-green-300">
          Policy updated at {new Date(lastPolicyReset).toLocaleString()}. The
          violation log was reset so counts align with the new directives.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-sm text-gray-200">
          Directive filter
          <select
            value={directiveFilter}
            onChange={(event) => onDirectiveFilterChange(event.target.value)}
            className="mt-1 rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white focus:border-ub-orange focus:outline-none"
          >
            <option value="all">All directives</option>
            {directiveOptions.map((directive) => (
              <option key={directive} value={directive}>
                {directive}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm text-gray-200">
          Origin filter
          <select
            value={originFilter}
            onChange={(event) => onOriginFilterChange(event.target.value)}
            className="mt-1 rounded border border-gray-600 bg-gray-900 p-2 text-sm text-white focus:border-ub-orange focus:outline-none"
          >
            <option value="all">All origins</option>
            {originOptions.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-2 rounded-md border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-gray-400">Total reports</p>
          <p className="text-lg font-semibold">{entries.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Unique directives</p>
          <p className="text-lg font-semibold">{directiveOptions.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Unique origins</p>
          <p className="text-lg font-semibold">{originOptions.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400">Filtered events</p>
          <p className="text-lg font-semibold">{filteredEntries.length}</p>
        </div>
      </div>
      <div>
        <h3 className="text-md font-semibold text-white">Grouped view</h3>
        {filteredGroups.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            No violation reports captured yet. Trigger the simulator to populate
            demo data.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-700">
            <div className="hidden bg-gray-800 text-xs uppercase text-gray-400 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-2 sm:px-3 sm:py-2">
              <span>Directive</span>
              <span>Origin</span>
              <span>Count</span>
              <span>Last seen</span>
            </div>
            <ul className="divide-y divide-gray-800">
              {filteredGroups.map((group) => (
                <li
                  key={group.key}
                  className={`cursor-pointer bg-gray-900 px-3 py-2 text-sm transition hover:bg-gray-800 ${
                    selectedKey === group.key ? 'border-l-4 border-ub-orange' : ''
                  }`}
                  onClick={() => setSelectedKey(group.key)}
                >
                  <div className="flex flex-col gap-1 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-2">
                    <span className="font-medium text-white">{group.directive}</span>
                    <span className="truncate text-gray-300">{group.origin}</span>
                    <span className="text-gray-200">{group.count}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(group.lastTimestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-md font-semibold text-white">Events</h3>
        {selectedGroup ? (
          <div className="mt-2 space-y-3">
            {selectedGroup.entries.slice(0, 20).map((entry) => (
              <article
                key={entry.id}
                className="rounded-md border border-gray-700 bg-gray-800 p-3 text-sm text-gray-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span className="font-mono">{entry.directive}</span>
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-gray-200">
                  Blocked resource:{' '}
                  <code className="break-all text-orange-300">
                    {entry.blockedURI || 'inline'}
                  </code>
                </p>
                <p className="text-xs text-gray-400">
                  Origin: <span className="font-mono">{entry.origin}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Document: <span className="font-mono">{entry.documentURI || 'n/a'}</span>
                </p>
                <p className="text-xs text-gray-500">Disposition: {entry.disposition}</p>
              </article>
            ))}
            {selectedGroup.entries.length > 20 ? (
              <p className="text-xs text-gray-500">
                Showing latest 20 events out of {selectedGroup.entries.length}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">
            Select a group above to inspect individual violation events.
          </p>
        )}
      </div>
      <div>
        <h3 className="text-md font-semibold text-white">Active Policy</h3>
        <pre className="mt-2 overflow-auto rounded-md border border-gray-700 bg-gray-950 p-3 text-xs text-green-300">
{policyString || '# No directives defined'}
        </pre>
      </div>
    </section>
  );
};

const CspReporterApp = () => {
  const [policy, setPolicy] = useState<DirectiveConfig[]>(DEFAULT_POLICY);
  const [log, setLog] = useState<ViolationLogEntry[]>([]);
  const [directiveFilter, setDirectiveFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [policyChangedAt, setPolicyChangedAt] = useState<number | null>(null);
  const policyString = useMemo(() => buildPolicyString(policy), [policy]);
  const sampleIndexRef = useRef(0);

  const applyPolicy = useCallback(
    (next: DirectiveConfig[]) => {
      const normalized = normalizePolicy(next);
      const changed =
        JSON.stringify(normalized) !== JSON.stringify(normalizePolicy(policy));
      setPolicy(normalized);
      if (changed) {
        setLog([]);
        setDirectiveFilter('all');
        setOriginFilter('all');
        setPolicyChangedAt(Date.now());
      }
    },
    [policy],
  );

  const clearLog = useCallback(() => {
    setLog([]);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: string; violation?: ViolationPayload };
      if (data.type !== 'csp-violation' || !data.violation) return;
      const payload = data.violation;
      const directiveSource =
        (payload.effectiveDirective as string | undefined) ||
        (payload.violatedDirective as string | undefined) ||
        (payload.directive as string | undefined) ||
        '';
      const directive = normalizeDirectiveName(directiveSource);
      if (!directive) return;
      const blockedURI =
        (payload.blockedURI as string | undefined) ||
        (payload.blockedUri as string | undefined) ||
        (payload.blockedUrl as string | undefined) ||
        (payload.blockedURL as string | undefined) ||
        '';
      const entry: ViolationLogEntry = {
        id:
          (payload.id as string | undefined) ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        directive,
        origin: deriveOrigin(blockedURI),
        blockedURI,
        documentURI:
          (payload.documentURI as string | undefined) ||
          (payload.documentUri as string | undefined) ||
          '',
        timestamp:
          typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
        disposition: (payload.disposition as string | undefined) || 'enforce',
        raw: payload,
      };
      setLog((prev) => {
        const next = [entry, ...prev];
        return next.length > MAX_LOG_ENTRIES ? next.slice(0, MAX_LOG_ENTRIES) : next;
      });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const simulateOne = useCallback(() => {
    if (typeof window === 'undefined') return;
    const index = sampleIndexRef.current % SAMPLE_VIOLATIONS.length;
    sampleIndexRef.current += 1;
    const baseTime = Date.now();
    const payload = {
      ...SAMPLE_VIOLATIONS[index],
      id: `${baseTime}-${index}`,
      timestamp: baseTime,
      originalPolicy: policyString,
    };
    window.postMessage(
      { type: 'csp-violation', violation: payload },
      window.location.origin,
    );
  }, [policyString]);

  const simulateBurst = useCallback(() => {
    if (typeof window === 'undefined') return;
    const start = Date.now();
    SAMPLE_VIOLATIONS.forEach((sample, idx) => {
      const payload = {
        ...sample,
        id: `${start}-${idx}`,
        timestamp: start + idx * 75,
        originalPolicy: policyString,
      };
      window.postMessage(
        { type: 'csp-violation', violation: payload },
        window.location.origin,
      );
    });
  }, [policyString]);

  return (
    <div className="h-full w-full overflow-auto bg-gray-950 p-6 text-white">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold">CSP Directive Lab</h1>
        <p className="text-sm text-gray-300">
          Explore how Content-Security-Policy directives affect simulated
          violation reports. Use the editor to tweak directives and observe how
          the reporter groups blocked resources by directive and origin.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <DirectiveEditor policy={policy} onApply={applyPolicy} />
        <ViolationReporter
          entries={log}
          directiveFilter={directiveFilter}
          originFilter={originFilter}
          onDirectiveFilterChange={setDirectiveFilter}
          onOriginFilterChange={setOriginFilter}
          onClear={clearLog}
          onSimulate={simulateOne}
          onSimulateBurst={simulateBurst}
          policyString={policyString}
          lastPolicyReset={policyChangedAt}
        />
      </div>
    </div>
  );
};

export default CspReporterApp;
