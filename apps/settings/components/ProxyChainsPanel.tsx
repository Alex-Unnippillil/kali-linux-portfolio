'use client';

import { useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  ProxyChainDefinition,
  ProxyChainNode,
  ProxyHealthMap,
  ProxyHealthStatus,
  ProxyNodeType,
  validateProxyChain,
} from '../../../utils/proxyValidator';

interface ChainFormNode {
  id: string;
  type: ProxyNodeType;
  next: string;
  status: ProxyHealthStatus;
}

interface SavedProxyChain {
  name: string;
  entryId: string;
  nodes: ProxyChainNode[];
  health: ProxyHealthMap;
}

const DEFAULT_NODE: ChainFormNode = {
  id: '',
  type: 'proxy',
  next: '',
  status: 'healthy',
};

const STATUS_OPTIONS: ProxyHealthStatus[] = [
  'healthy',
  'degraded',
  'warning',
  'down',
  'offline',
];

const NODE_TYPES: ProxyNodeType[] = ['proxy', 'endpoint'];

const createDefaultNodes = (): ChainFormNode[] => [
  { ...DEFAULT_NODE },
  { ...DEFAULT_NODE, type: 'endpoint', status: 'healthy', next: '' },
];

const normalizeNodes = (nodes: ChainFormNode[]): ProxyChainNode[] =>
  nodes.map((node) => ({
    id: node.id.trim(),
    type: node.type,
    next:
      node.type === 'endpoint'
        ? []
        : node.next
            .split(',')
            .map((n) => n.trim())
            .filter(Boolean),
  }));

const buildHealthMap = (nodes: ChainFormNode[]): ProxyHealthMap => {
  const map: ProxyHealthMap = {};
  nodes.forEach((node) => {
    const id = node.id.trim();
    if (id) {
      map[id] = node.status;
    }
  });
  return map;
};

const sortNodesById = (nodes: ChainFormNode[]) =>
  [...nodes].sort((a, b) => a.id.localeCompare(b.id));

export default function ProxyChainsPanel() {
  const [chains, setChains] = usePersistentState<SavedProxyChain[]>(
    'proxy-chains',
    [],
    (value): value is SavedProxyChain[] =>
      Array.isArray(value) &&
      value.every(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof entry.name === 'string' &&
          typeof entry.entryId === 'string' &&
          Array.isArray(entry.nodes) &&
          typeof entry.health === 'object' &&
          entry.health !== null,
      ),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [entryId, setEntryId] = useState('');
  const [nodes, setNodes] = useState<ChainFormNode[]>(createDefaultNodes);
  const [errors, setErrors] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedNodes = useMemo(() => sortNodesById(nodes), [nodes]);

  const resetForm = () => {
    setName('');
    setEntryId('');
    setNodes(createDefaultNodes());
    setEditingIndex(null);
    setErrors([]);
    setStatusMessage(null);
  };

  const addNode = () => {
    setNodes((prev) => [...prev, { ...DEFAULT_NODE }]);
  };

  const updateNode = (index: number, key: keyof ChainFormNode, value: string) => {
    setNodes((prev) =>
      prev.map((node, i) => {
        if (i !== index) return node;
        if (key === 'type') {
          const typeValue = value as ProxyNodeType;
          return {
            ...node,
            type: typeValue,
            next: typeValue === 'endpoint' ? '' : node.next,
          };
        }
        if (key === 'status') {
          return { ...node, status: value as ProxyHealthStatus };
        }
        return { ...node, [key]: value };
      }),
    );
  };

  const removeNode = (index: number) => {
    setNodes((prev) => {
      if (prev.length <= 1) return createDefaultNodes();
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : createDefaultNodes();
    });
  };

  const loadChain = (index: number) => {
    const chain = chains[index];
    if (!chain) return;
    setEditingIndex(index);
    setName(chain.name);
    setEntryId(chain.entryId);
    setNodes(
      chain.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        next: node.next.join(', '),
        status: chain.health[node.id] ?? 'healthy',
      })),
    );
    setErrors([]);
    setStatusMessage(null);
  };

  const deleteChain = (index: number) => {
    setChains((prev) => prev.filter((_, i) => i !== index));
    setStatusMessage('Chain removed.');
    if (editingIndex === index) {
      resetForm();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleSave = () => {
    const fieldErrors: string[] = [];
    const trimmedName = name.trim();
    const trimmedEntry = entryId.trim();

    if (!trimmedName) {
      fieldErrors.push('Chain name is required.');
    }
    if (!trimmedEntry) {
      fieldErrors.push('Entry node is required.');
    }

    const normalizedNodes = normalizeNodes(nodes);

    normalizedNodes.forEach((node, index) => {
      if (!node.id) {
        fieldErrors.push(`Node ${index + 1} is missing an identifier.`);
      }
      if (node.type !== 'endpoint' && node.next.length === 0) {
        fieldErrors.push(`Proxy node "${node.id || index + 1}" should link to at least one target.`);
      }
    });

    if (
      trimmedEntry &&
      !normalizedNodes.some((node) => node.id === trimmedEntry)
    ) {
      fieldErrors.push('Entry node must correspond to one of the defined node IDs.');
    }

    const nameConflict = chains.findIndex((chain, index) => {
      if (editingIndex !== null && index === editingIndex) return false;
      return chain.name.trim().toLowerCase() === trimmedName.toLowerCase();
    });
    if (trimmedName && nameConflict !== -1) {
      fieldErrors.push(`A chain named "${trimmedName}" already exists.`);
    }

    const healthMap = buildHealthMap(nodes);

    if (fieldErrors.length) {
      setErrors(fieldErrors);
      setStatusMessage(null);
      return;
    }

    const definition: ProxyChainDefinition = {
      entryId: trimmedEntry,
      nodes: normalizedNodes,
    };

    const issues = validateProxyChain(definition, healthMap);

    if (issues.length) {
      setErrors(issues.map((issue) => issue.message));
      setStatusMessage(null);
      return;
    }

    const isNew = editingIndex === null;

    setChains((prev) => {
      const updated = [...prev];
      let nextIndex = editingIndex;
      const payload: SavedProxyChain = {
        name: trimmedName,
        entryId: trimmedEntry,
        nodes: normalizedNodes,
        health: healthMap,
      };
      if (nextIndex === null) {
        updated.push(payload);
        nextIndex = updated.length - 1;
      } else {
        updated[nextIndex] = payload;
      }
      setEditingIndex(nextIndex);
      return updated;
    });

    setErrors([]);
    setStatusMessage(isNew ? 'Chain saved.' : 'Chain updated.');
  };

  const startNewChain = () => {
    resetForm();
    setStatusMessage('Creating new chain.');
  };

  return (
    <section className="mt-6 rounded border border-gray-800 bg-gray-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Proxy Chains</h2>
        <button
          type="button"
          onClick={startNewChain}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-ubt-grey hover:bg-gray-700"
        >
          New chain
        </button>
      </div>
      <p className="mt-1 text-xs text-ubt-grey">
        Configure hop sequences for simulated proxy routing. Chains must be acyclic, use unique node
        identifiers, and end on healthy endpoints.
      </p>
      {errors.length > 0 && (
        <div className="mt-3 rounded border border-red-500 bg-red-900/40 p-2 text-sm text-red-200">
          <ul className="ml-4 list-disc space-y-1">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {statusMessage && errors.length === 0 && (
        <div className="mt-3 rounded border border-green-600 bg-green-900/40 p-2 text-sm text-green-300">
          {statusMessage}
        </div>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col text-sm">
          <span className="mb-1">Chain name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
            placeholder="Red team circuit"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">Entry node</span>
          <input
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
            placeholder="gateway-1"
          />
        </label>
      </div>
      <div className="mt-4 space-y-3">
        {nodes.map((node, index) => (
          <div
            key={`${node.id || 'node'}-${index}`}
            className="rounded border border-gray-800 bg-ub-grey p-3"
          >
            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold text-ubt-grey">Node ID</span>
                <input
                  value={node.id}
                  onChange={(e) => updateNode(index, 'id', e.target.value)}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
                  placeholder={`node-${index + 1}`}
                />
              </label>
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold text-ubt-grey">Type</span>
                <select
                  value={node.type}
                  onChange={(e) => updateNode(index, 'type', e.target.value)}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
                >
                  {NODE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold text-ubt-grey">Next nodes</span>
                <input
                  value={node.next}
                  onChange={(e) => updateNode(index, 'next', e.target.value)}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
                  placeholder={node.type === 'endpoint' ? '—' : 'comma-separated ids'}
                  disabled={node.type === 'endpoint'}
                />
              </label>
              <label className="flex flex-col text-xs">
                <span className="mb-1 font-semibold text-ubt-grey">Health</span>
                <select
                  value={node.status}
                  onChange={(e) => updateNode(index, 'status', e.target.value)}
                  className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeNode(index)}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-ubt-grey hover:bg-gray-700"
              >
                Remove node
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addNode}
          className="rounded bg-ub-orange px-3 py-1 text-sm text-black"
        >
          Add node
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-ub-green px-4 py-1 text-sm text-black"
        >
          Save chain
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="rounded bg-gray-800 px-4 py-1 text-sm text-ubt-grey hover:bg-gray-700"
        >
          Clear form
        </button>
      </div>
      {chains.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ubt-grey">Saved chains</h3>
          <ul className="mt-2 space-y-2 text-xs">
            {chains.map((chain, index) => (
              <li
                key={chain.name}
                className={`flex items-center justify-between rounded border border-gray-800 bg-gray-900/70 px-3 py-2 ${
                  editingIndex === index ? 'ring-1 ring-ub-orange' : ''
                }`}
              >
                <div>
                  <div className="font-medium text-white">{chain.name}</div>
                  <div className="text-ubt-grey">
                    Entry: {chain.entryId} · Nodes: {chain.nodes.length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadChain(index)}
                    className="rounded bg-gray-800 px-2 py-1 text-ubt-grey hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteChain(index)}
                    className="rounded bg-red-900 px-2 py-1 text-red-200 hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 rounded border border-gray-800 bg-gray-900/50 p-3 text-xs text-ubt-grey">
        <p className="font-semibold">Reachability preview</p>
        {sortedNodes.length === 0 ? (
          <p>No nodes defined.</p>
        ) : (
          <ul className="ml-4 list-disc space-y-1">
            {sortedNodes.map((node) => (
              <li key={`${node.id}-${node.type}`}>
                <span className="text-white">{node.id || '(unnamed)'}</span>
                <span className="ml-2 text-ubt-grey">• {node.type}</span>
                {node.type !== 'endpoint' && node.next && (
                  <span className="ml-2 text-ubt-grey">→ {node.next}</span>
                )}
                <span className="ml-2 text-ubt-grey">[{node.status}]</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
