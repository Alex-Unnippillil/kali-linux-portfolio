'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';

interface ModuleDef {
  deps: string[];
  tags: string[];
}

export type ModuleStatus = 'installed' | 'missing' | 'error';

interface ModuleMetadata {
  status: ModuleStatus;
  version?: string;
  note?: string;
}

export interface ModuleGraphNode {
  id: string;
  status: ModuleStatus;
  isSelected: boolean;
  isVirtual: boolean;
}

export interface ModuleGraphLink {
  source: string;
  target: string;
  status: 'ok' | 'blocked';
}

const MODULES: Record<string, ModuleDef> = {
  'DNS Enumeration': { deps: [], tags: ['dns', 'recon'] },
  'WHOIS Lookup': { deps: ['DNS Enumeration'], tags: ['whois', 'network'] },
  'Reverse IP Lookup': { deps: ['WHOIS Lookup'], tags: ['ip'] },
  'Port Scan': { deps: ['Reverse IP Lookup'], tags: ['ports', 'network'] },
};

const MODULE_METADATA_STORAGE_KEY = 'reconng-module-metadata';
const MODULE_METADATA_EVENT = 'reconng-module-metadata-update';

const moduleNames = Object.keys(MODULES);
const WORKSPACES = ['default', 'testing', 'production'];
const STATUS_OPTIONS: { value: ModuleStatus; label: string; description: string }[] = [
  { value: 'installed', label: 'Installed', description: 'Module is installed and ready to use.' },
  { value: 'missing', label: 'Missing', description: 'Module is not installed yet.' },
  { value: 'error', label: 'Error', description: 'Module is installed but requires attention.' },
];

const STATUS_COLORS: Record<ModuleStatus, string> = {
  installed: '#22c55e',
  missing: '#6b7280',
  error: '#ef4444',
};

const STATUS_ICONS: Record<ModuleStatus, string> = {
  installed: '✓',
  missing: '•',
  error: '!',
};

const isValidStatus = (status: string): status is ModuleStatus =>
  status === 'installed' || status === 'missing' || status === 'error';

const ensureMetadataShape = (
  modules: string[],
  metadata: Record<string, ModuleMetadata | undefined>,
): Record<string, ModuleMetadata> => {
  const result: Record<string, ModuleMetadata> = {};
  modules.forEach((moduleId) => {
    const entry = metadata[moduleId];
    if (entry && isValidStatus(entry.status)) {
      result[moduleId] = {
        status: entry.status,
        version: typeof entry.version === 'string' ? entry.version : undefined,
        note: typeof entry.note === 'string' ? entry.note : undefined,
      };
    } else {
      result[moduleId] = { status: 'missing' };
    }
  });
  return result;
};

const metadataEquals = (
  a: Record<string, ModuleMetadata>,
  b: Record<string, ModuleMetadata>,
  modules: string[],
) =>
  modules.every((id) => {
    const left = a[id];
    const right = b[id];
    return (
      left?.status === right?.status &&
      left?.version === right?.version &&
      left?.note === right?.note
    );
  });

const loadMetadata = (modules: string[]): Record<string, ModuleMetadata> => {
  if (typeof window === 'undefined') {
    return ensureMetadataShape(modules, {});
  }
  try {
    const stored = window.localStorage.getItem(MODULE_METADATA_STORAGE_KEY);
    if (!stored) {
      return ensureMetadataShape(modules, {});
    }
    const parsed = JSON.parse(stored) as Record<string, ModuleMetadata | undefined>;
    return ensureMetadataShape(modules, parsed ?? {});
  } catch {
    return ensureMetadataShape(modules, {});
  }
};

const persistMetadata = (metadata: Record<string, ModuleMetadata>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      MODULE_METADATA_STORAGE_KEY,
      JSON.stringify(metadata),
    );
  } catch {
    // ignore write errors
  }
  window.dispatchEvent(
    new CustomEvent(MODULE_METADATA_EVENT, { detail: metadata }),
  );
};

const useModuleMetadata = (modules: string[]) => {
  const [metadata, setMetadata] = useState<Record<string, ModuleMetadata>>(() =>
    loadMetadata(modules),
  );

  useEffect(() => {
    setMetadata((prev) => ensureMetadataShape(modules, prev));
  }, [modules]);

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== MODULE_METADATA_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as Record<
          string,
          ModuleMetadata | undefined
        >;
        const next = ensureMetadataShape(modules, parsed);
        setMetadata((prev) => (metadataEquals(prev, next, modules) ? prev : next));
      } catch {
        // ignore malformed payloads
      }
    };

    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, ModuleMetadata>>)
        .detail;
      if (!detail) return;
      const next = ensureMetadataShape(modules, detail);
      setMetadata((prev) => (metadataEquals(prev, next, modules) ? prev : next));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(MODULE_METADATA_EVENT, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(MODULE_METADATA_EVENT, handleCustom);
    };
  }, [modules]);

  const updateMetadata = useCallback(
    (updater: (current: Record<string, ModuleMetadata>) => Record<string, ModuleMetadata>) => {
      setMetadata((prev) => {
        const ensuredPrev = ensureMetadataShape(modules, prev);
        const next = ensureMetadataShape(modules, updater(ensuredPrev));
        if (!metadataEquals(ensuredPrev, next, modules)) {
          persistMetadata(next);
        }
        return next;
      });
    },
    [modules],
  );

  return [metadata, updateMetadata] as const;
};

export const buildModuleGraph = (
  modules: Record<string, ModuleDef>,
  metadata: Record<string, ModuleMetadata>,
  selection: string[],
) => {
  const nodes = new Map<string, ModuleGraphNode>();
  const links: ModuleGraphLink[] = [];

  const ensureNode = (id: string, isVirtual = false) => {
    if (nodes.has(id)) {
      if (isVirtual) {
        nodes.set(id, { ...nodes.get(id)!, isVirtual: true });
      }
      return nodes.get(id)!;
    }
    const entry = metadata[id];
    const status = entry && isValidStatus(entry.status) ? entry.status : 'missing';
    const node: ModuleGraphNode = {
      id,
      status,
      isSelected: selection.includes(id),
      isVirtual,
    };
    nodes.set(id, node);
    return node;
  };

  Object.entries(modules).forEach(([moduleId, definition]) => {
    const node = ensureNode(moduleId);
    node.isVirtual = false;
    node.isSelected = selection.includes(moduleId);
    definition.deps.forEach((dependencyId) => {
      const dependencyNode = ensureNode(
        dependencyId,
        !modules[dependencyId],
      );
      const dependencyStatus = dependencyNode.status;
      const status: ModuleGraphLink['status'] =
        dependencyStatus === 'installed' ? 'ok' : 'blocked';
      links.push({ source: dependencyId, target: moduleId, status });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
};

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const ModulePlanner: React.FC = () => {
  const [plan, setPlan] = usePersistentState<string[]>('reconng-plan', []);
  const [workspace, setWorkspace] = usePersistentState<string>(
    'reconng-workspace',
    WORKSPACES[0],
  );
  const [log, setLog] = useState('');
  const [metadata, updateMetadata] = useModuleMetadata(moduleNames);

  const toggle = (name: string) => {
    setPlan((p) =>
      p.includes(name) ? p.filter((m) => m !== name) : [...p, name],
    );
  };

  const setStatus = (moduleId: string, status: ModuleStatus) => {
    updateMetadata((current) => ({
      ...current,
      [moduleId]: {
        ...current[moduleId],
        status,
      },
    }));
  };

  const exportPlan = () => {
    const lines = [
      `Workspace: ${workspace}`,
      'Modules:',
      ...plan.map((m) => `- ${m} (${metadata[m]?.status ?? 'missing'})`),
    ];
    setLog(lines.join('\n'));
  };

  const graphData = useMemo(
    () => buildModuleGraph(MODULES, metadata, plan),
    [metadata, plan],
  );

  const legendItems = useMemo(
    () =>
      STATUS_OPTIONS.map(({ value, label, description }) => ({
        value,
        label,
        description,
        color: STATUS_COLORS[value],
        icon: STATUS_ICONS[value],
      })),
    [],
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 text-white h-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="workspace" className="font-semibold">
            Workspace:
          </label>
          <select
            id="workspace"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="text-black p-1 rounded"
          >
            {WORKSPACES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {legendItems.map((item) => (
            <div key={item.value} className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden
              >
                {item.icon}
              </span>
              <div>
                <div className="font-semibold">{item.label}</div>
                <div className="text-gray-400">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {moduleNames.map((m) => {
            const mod = MODULES[m];
            const active = plan.includes(m);
            const status = metadata[m]?.status ?? 'missing';
            return (
              <div
                key={m}
                className={`border rounded p-3 transition-colors ${
                  active
                    ? 'bg-blue-900/60 border-blue-500'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    className="text-left font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {m}
                  </button>
                  <select
                    value={status}
                    onChange={(e) => setStatus(m, e.target.value as ModuleStatus)}
                    className="rounded bg-gray-900 px-2 py-1 text-xs text-white border border-gray-700"
                    aria-label={`Set status for ${m}`}
                  >
                    {STATUS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {mod.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-gray-700 px-2 py-0.5 rounded-full uppercase tracking-wider"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-300">
                  Status:{' '}
                  <span style={{ color: STATUS_COLORS[status] }} className="font-semibold">
                    {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="lg:col-span-2">
          <div className="h-72 rounded bg-black">
            <ForceGraph2D
              graphData={graphData}
              nodeId="id"
              linkDirectionalArrowLength={6}
              linkColor={(link: ModuleGraphLink) =>
                link.status === 'ok' ? '#4ade80' : '#f87171'
              }
              linkDirectionalArrowColor={(link: ModuleGraphLink) =>
                link.status === 'ok' ? '#4ade80' : '#f87171'
              }
              nodeCanvasObject={(node: ModuleGraphNode & { x?: number; y?: number }, ctx, globalScale) => {
                const radius = node.isSelected ? 10 : 8;
                const x = node.x ?? 0;
                const y = node.y ?? 0;
                ctx.beginPath();
                ctx.fillStyle = STATUS_COLORS[node.status];
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.fill();

                if (node.isVirtual) {
                  ctx.strokeStyle = '#facc15';
                  ctx.lineWidth = 2;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath();
                  ctx.arc(x, y, radius + 3, 0, 2 * Math.PI, false);
                  ctx.stroke();
                  ctx.setLineDash([]);
                } else {
                  ctx.strokeStyle = '#111827';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.arc(x, y, radius + 2, 0, 2 * Math.PI, false);
                  ctx.stroke();
                }

                ctx.fillStyle = '#0f172a';
                ctx.font = `${10 / globalScale}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(STATUS_ICONS[node.status], x, y + 1);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#e5e7eb';
                ctx.font = `${12 / globalScale}px sans-serif`;
                ctx.fillText(node.id, x + radius + 6, y);
              }}
              nodePointerAreaPaint={(node: ModuleGraphNode & { x?: number; y?: number }, color, ctx) => {
                const radius = node.isSelected ? 12 : 10;
                const x = node.x ?? 0;
                const y = node.y ?? 0;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-300">
            Select modules to highlight them in the graph. Dependencies outlined in
            gold indicate modules that are referenced but missing from the current
            catalog. Red edges represent blocked chains due to missing or failing
            prerequisites.
          </p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={exportPlan}
          className="px-3 py-2 bg-blue-700 rounded shadow hover:bg-blue-600 transition"
        >
          Export Plan
        </button>
        {log && (
          <pre className="mt-2 bg-black text-green-400 p-2 rounded font-mono whitespace-pre-wrap max-h-40 overflow-auto">
            {log}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ModulePlanner;

