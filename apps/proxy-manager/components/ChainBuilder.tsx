'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Draggable, {
  DraggableData,
  DraggableEvent,
} from 'react-draggable';

export type ProxyNodeType = 'SOCKS5' | 'HTTP';
export type ProxyNodeHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

export type ValidationOutcome =
  | ProxyNodeHealth
  | {
      health: ProxyNodeHealth;
      message?: string;
    };

export interface ProxyChainNode {
  id: string;
  type: ProxyNodeType;
  endpoint: string;
  health: ProxyNodeHealth;
  position: {
    x: number;
    y: number;
  };
  validating?: boolean;
  validationMessage?: string;
}

export interface InitialProxyNode
  extends Partial<Omit<ProxyChainNode, 'id' | 'type' | 'endpoint'>> {
  id?: string;
  type: ProxyNodeType;
  endpoint: string;
}

export interface ChainBuilderProps {
  initialNodes?: InitialProxyNode[];
  onChainChange?: (nodes: ProxyChainNode[]) => void;
  onValidate?: (
    node: ProxyChainNode,
  ) => Promise<ValidationOutcome | void> | ValidationOutcome | void;
  onTestChain?: (nodes: ProxyChainNode[]) => void | Promise<void>;
}

const DEFAULT_CARD_WIDTH = 240;
const DEFAULT_CARD_HEIGHT = 160;
const DEFAULT_POSITION_Y = 48;
const CARD_GAP = 56;
const DRAG_GRID: [number, number] = [8, 8];

const HEALTH_THEME: Record<ProxyNodeHealth, {
  border: string;
  indicator: string;
  text: string;
  arrow: string;
}> = {
  healthy: {
    border: 'border-emerald-500/60',
    indicator: 'bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
    text: 'text-emerald-200',
    arrow: '#34d399',
  },
  warning: {
    border: 'border-amber-400/60',
    indicator: 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]',
    text: 'text-amber-200',
    arrow: '#fbbf24',
  },
  critical: {
    border: 'border-rose-500/70',
    indicator: 'bg-rose-500 shadow-[0_0_0_4px_rgba(251,113,133,0.2)]',
    text: 'text-rose-200',
    arrow: '#fb7185',
  },
  unknown: {
    border: 'border-slate-500/50',
    indicator: 'bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.15)]',
    text: 'text-slate-200',
    arrow: '#94a3b8',
  },
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `proxy-${Math.random().toString(36).slice(2, 10)}`;
};

const isProxyNodeHealth = (value: unknown): value is ProxyNodeHealth =>
  value === 'healthy' ||
  value === 'warning' ||
  value === 'critical' ||
  value === 'unknown';

const normalizeValidation = (
  outcome: ValidationOutcome,
): { health: ProxyNodeHealth; message?: string } => {
  if (typeof outcome === 'string') {
    if (isProxyNodeHealth(outcome)) {
      return { health: outcome };
    }
    return { health: 'unknown', message: outcome };
  }
  if (outcome && isProxyNodeHealth(outcome.health)) {
    return { health: outcome.health, message: outcome.message };
  }
  return { health: 'unknown' };
};

const createNode = (type: ProxyNodeType, index: number): ProxyChainNode => ({
  id: createId(),
  type,
  endpoint: '',
  health: 'unknown',
  position: {
    x: index * (DEFAULT_CARD_WIDTH + CARD_GAP),
    y: DEFAULT_POSITION_Y,
  },
  validating: false,
});

const normalizeInitialNodes = (
  initialNodes?: InitialProxyNode[],
): ProxyChainNode[] => {
  if (!initialNodes || initialNodes.length === 0) {
    return [];
  }
  return initialNodes.map((node, index) => ({
    id: node.id ?? createId(),
    type: node.type,
    endpoint: node.endpoint,
    health: node.health ?? 'unknown',
    position:
      node.position ?? {
        x: index * (DEFAULT_CARD_WIDTH + CARD_GAP),
        y: DEFAULT_POSITION_Y,
      },
    validating: Boolean(node.validating),
    validationMessage: node.validationMessage,
  }));
};

const nodesEqual = (a: ProxyChainNode[], b: ProxyChainNode[]) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((node, index) => {
    const other = b[index];
    if (!other) return false;
    return (
      node.id === other.id &&
      node.type === other.type &&
      node.endpoint === other.endpoint &&
      node.health === other.health &&
      node.position.x === other.position.x &&
      node.position.y === other.position.y &&
      node.validationMessage === other.validationMessage &&
      Boolean(node.validating) === Boolean(other.validating)
    );
  });
};

const formatHealth = (health: ProxyNodeHealth) => {
  switch (health) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Needs Attention';
    case 'critical':
      return 'Offline';
    default:
      return 'Unknown';
  }
};

export default function ChainBuilder({
  initialNodes,
  onChainChange,
  onValidate,
  onTestChain,
}: ChainBuilderProps) {
  const [nodes, setNodes] = useState<ProxyChainNode[]>(() => {
    const normalized = normalizeInitialNodes(initialNodes);
    if (normalized.length > 0) {
      return normalized;
    }
    return [createNode('HTTP', 0)];
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nodeSizes, setNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const validationCounters = useRef<Map<string, number>>(new Map());
  const nodesRef = useRef<ProxyChainNode[]>(nodes);
  const onChainChangeRef = useRef(onChainChange);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onChainChangeRef.current = onChainChange;
  }, [onChainChange]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!initialNodes) return;
    const normalized = normalizeInitialNodes(initialNodes);
    setNodes((current) => {
      if (nodesEqual(current, normalized)) {
        return current;
      }
      return normalized;
    });
  }, [initialNodes]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });
    resizeObserver.observe(element);
    setContainerSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!onChainChangeRef.current) return;
    onChainChangeRef.current(nodes);
  }, [nodes]);

  const updateNode = useCallback(
    (id: string, updater: (node: ProxyChainNode) => ProxyChainNode) => {
      setNodes((prev) => {
        let changed = false;
        const next = prev.map((node) => {
          if (node.id !== id) return node;
          const updated = updater(node);
          if (updated !== node) {
            changed = true;
          }
          return updated;
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const nodeObservers = useRef<Map<string, ResizeObserver>>(new Map());

  useEffect(() => () => {
    nodeObservers.current.forEach((observer) => observer.disconnect());
    nodeObservers.current.clear();
  }, []);

  const handleNodeRef = useCallback((id: string, element: HTMLDivElement | null) => {
    const existing = nodeObservers.current.get(id);
    if (existing) {
      existing.disconnect();
      nodeObservers.current.delete(id);
    }
    if (!element) {
      setNodeSizes((prev) => {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setNodeSizes((prev) => {
        const current = prev[id];
        const width = rect.width;
        const height = rect.height;
        if (current && current.width === width && current.height === height) {
          return prev;
        }
        return {
          ...prev,
          [id]: { width, height },
        };
      });
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    nodeObservers.current.set(id, resizeObserver);
  }, []);

  const runValidation = useCallback(
    async (node: ProxyChainNode) => {
      if (!onValidate) return;
      const counter = (validationCounters.current.get(node.id) ?? 0) + 1;
      validationCounters.current.set(node.id, counter);
      updateNode(node.id, (current) => ({
        ...current,
        validating: true,
        validationMessage: undefined,
      }));
      try {
        const outcome = await onValidate({ ...node, validating: false });
        if (validationCounters.current.get(node.id) !== counter) {
          return;
        }
        if (!outcome) {
          updateNode(node.id, (current) => ({
            ...current,
            validating: false,
          }));
          return;
        }
        const { health, message } = normalizeValidation(outcome);
        updateNode(node.id, (current) => ({
          ...current,
          validating: false,
          health,
          validationMessage: message,
        }));
      } catch (error) {
        if (validationCounters.current.get(node.id) !== counter) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'Validation failed';
        updateNode(node.id, (current) => ({
          ...current,
          validating: false,
          health: 'critical',
          validationMessage: message,
        }));
      }
    },
    [onValidate, updateNode],
  );

  const handleEndpointChange = useCallback(
    (id: string, value: string) => {
      let updatedNode: ProxyChainNode | null = null;
      updateNode(id, (current) => {
        updatedNode = {
          ...current,
          endpoint: value,
          validationMessage: undefined,
        };
        return updatedNode;
      });
      if (updatedNode) {
        runValidation(updatedNode);
      }
    },
    [runValidation, updateNode],
  );

  const handleTypeChange = useCallback(
    (id: string, type: ProxyNodeType) => {
      let updatedNode: ProxyChainNode | null = null;
      updateNode(id, (current) => {
        updatedNode = {
          ...current,
          type,
          validationMessage: undefined,
        };
        return updatedNode;
      });
      if (updatedNode) {
        runValidation(updatedNode);
      }
    },
    [runValidation, updateNode],
  );

  const handleAddNode = useCallback(
    (type: ProxyNodeType) => {
      let newNode: ProxyChainNode | null = null;
      setNodes((prev) => {
        const index = prev.length;
        newNode = createNode(type, index);
        return [...prev, newNode];
      });
      if (newNode) {
        runValidation(newNode);
      }
    },
    [runValidation],
  );

  const handleDrag = useCallback(
    (id: string) => (_: DraggableEvent, data: DraggableData) => {
      updateNode(id, (current) => ({
        ...current,
        position: { x: data.x, y: data.y },
      }));
    },
    [updateNode],
  );

  const handleDragStart = useCallback((id: string) => () => {
    setDraggingId(id);
  }, []);

  const handleDragStop = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleTestChain = useCallback(() => {
    if (!onTestChain) return;
    onTestChain(nodesRef.current);
  }, [onTestChain]);

  useEffect(() => {
    if (!onValidate) return;
    nodesRef.current.forEach((node) => {
      runValidation(node);
    });
  }, [onValidate, runValidation]);

  const connections = useMemo(() => {
    if (nodes.length < 2) return [];
    return nodes.slice(0, -1).map((node, index) => {
      const next = nodes[index + 1];
      const size = nodeSizes[node.id] ?? {
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
      };
      const nextSize = nodeSizes[next.id] ?? {
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
      };
      const start = {
        x: node.position.x + size.width,
        y: node.position.y + size.height / 2,
      };
      const end = {
        x: next.position.x,
        y: next.position.y + nextSize.height / 2,
      };
      const horizontal = end.x - start.x;
      const offset = Math.max(Math.abs(horizontal) / 2, 48);
      const control1X = start.x + (horizontal >= 0 ? offset : -offset);
      const control2X = end.x - (horizontal >= 0 ? offset : -offset);
      const control1Y = start.y;
      const control2Y = end.y;
      const path = `M ${start.x} ${start.y} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${end.x} ${end.y}`;
      return {
        id: `${node.id}-${next.id}`,
        path,
        color: HEALTH_THEME[node.health].arrow,
      };
    });
  }, [nodeSizes, nodes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAddNode('SOCKS5')}
            className="rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Add SOCKS Proxy
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('HTTP')}
            className="rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Add HTTP Proxy
          </button>
        </div>
        <button
          type="button"
          onClick={handleTestChain}
          disabled={!onTestChain}
          className="rounded-lg border border-sky-600 bg-sky-600/80 px-4 py-2 text-sm font-semibold text-white shadow transition enabled:hover:bg-sky-500/90 enabled:focus-visible:ring-2 enabled:focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-400"
        >
          Test chain
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative h-[28rem] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 p-4"
      >
        <svg
          className="pointer-events-none absolute inset-0"
          width={containerSize.width}
          height={containerSize.height}
        >
          <defs>
            <marker
              id="chain-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="context-stroke" />
            </marker>
          </defs>
          {connections.map((connection) => (
            <path
              key={connection.id}
              d={connection.path}
              stroke={connection.color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              markerEnd="url(#chain-arrow)"
            />
          ))}
        </svg>
        {nodes.length === 0 && (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            Use the buttons above to add proxy nodes to your chain.
          </div>
        )}
        {nodes.map((node) => {
          const theme = HEALTH_THEME[node.health];
          const isDragging = draggingId === node.id;
          return (
            <Draggable
              key={node.id}
              grid={DRAG_GRID}
              bounds="parent"
              position={node.position}
              onDrag={handleDrag(node.id)}
              onStart={handleDragStart(node.id)}
              onStop={handleDragStop}
            >
              <div
                ref={(element) => handleNodeRef(node.id, element)}
                className={`absolute w-[15rem] min-h-[10rem] cursor-move select-none rounded-2xl border bg-slate-900/90 p-4 text-sm text-slate-100 shadow-lg backdrop-blur transition ${theme.border} ${
                  isDragging ? 'ring-2 ring-sky-500/80' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                      Proxy type
                    </p>
                    <select
                      value={node.type}
                      onChange={(event) =>
                        handleTypeChange(node.id, event.target.value as ProxyNodeType)
                      }
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="HTTP">HTTP Proxy</option>
                      <option value="SOCKS5">SOCKS5 Proxy</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${theme.text}`}
                    >
                      <span
                        className={`inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${theme.indicator}`}
                        aria-hidden
                      />
                      {node.validating ? 'Validating…' : formatHealth(node.health)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor={`${node.id}-endpoint`}
                    className="block text-[0.7rem] uppercase tracking-wide text-slate-400"
                  >
                    Endpoint
                  </label>
                  <input
                    id={`${node.id}-endpoint`}
                    type="text"
                    value={node.endpoint}
                    onChange={(event) =>
                      handleEndpointChange(node.id, event.target.value)
                    }
                    placeholder="e.g. proxy.example:9050"
                    className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                {node.validationMessage && (
                  <p className="mt-3 text-xs text-amber-200">
                    {node.validationMessage}
                  </p>
                )}
              </div>
            </Draggable>
          );
        })}
      </div>
    </div>
  );
}
