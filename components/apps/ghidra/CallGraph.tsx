import React, { useEffect, useMemo, useRef, useState } from 'react';

type FunctionNode = {
  name: string;
  calls?: string[];
};

type CallGraphProps = {
  func?: FunctionNode | null;
  callers?: string[];
  onSelect?: (name: string) => void;
  funcMap?: Record<string, FunctionNode>;
  xrefs?: Record<string, string[]>;
  prefersReducedMotion?: boolean;
};

type Position = {
  x: number;
  y: number;
};

const ROOT_CRUMB = '__full_graph__';
const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 260;

function computeFullLayout(funcMap: Record<string, FunctionNode> | undefined) {
  const functions = Object.keys(funcMap ?? {}).sort();
  if (!functions.length) return {} as Record<string, Position>;

  const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 40;
  const layout: Record<string, Position> = {};

  functions.forEach((name, index) => {
    const angle = (2 * Math.PI * index) / functions.length;
    layout[name] = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });

  return layout;
}

function buildCallersMap(
  funcMap: Record<string, FunctionNode> | undefined,
  xrefs: Record<string, string[]> | undefined
) {
  const callersMap: Record<string, string[]> = {};

  Object.values(funcMap ?? {}).forEach((fn) => {
    (fn.calls ?? []).forEach((callee) => {
      if (!callersMap[callee]) callersMap[callee] = [];
      callersMap[callee].push(fn.name);
    });
  });

  Object.entries(xrefs ?? {}).forEach(([target, sources]) => {
    if (!callersMap[target]) callersMap[target] = [];
    callersMap[target] = Array.from(new Set([...(callersMap[target] ?? []), ...sources]));
  });

  return callersMap;
}

function getVisibleNodes(
  focusNode: string | null,
  funcMap: Record<string, FunctionNode> | undefined,
  callersMap: Record<string, string[]>,
  explicitCallers?: string[]
) {
  if (!focusNode) {
    return Object.keys(funcMap ?? {}).sort();
  }

  const current = funcMap?.[focusNode];
  const neighbors = new Set<string>();
  neighbors.add(focusNode);
  (current?.calls ?? []).forEach((callee) => neighbors.add(callee));
  (explicitCallers ?? callersMap[focusNode] ?? []).forEach((caller) =>
    neighbors.add(caller)
  );

  return Array.from(neighbors);
}

function computeSubgraphLayout(
  focusNode: string,
  nodes: string[],
  baseLayout: Record<string, Position>
) {
  const layout: Record<string, Position> = {};
  const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  layout[focusNode] = center;

  const neighbors = nodes.filter((node) => node !== focusNode);
  if (!neighbors.length) {
    return layout;
  }

  const baseCenter = baseLayout[focusNode] ?? center;
  const sorted = neighbors
    .map((name) => {
      const pos = baseLayout[name];
      if (!pos) {
        return { name, angle: 0 };
      }
      return { name, angle: Math.atan2(pos.y - baseCenter.y, pos.x - baseCenter.x) };
    })
    .sort((a, b) => a.angle - b.angle);

  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 50;
  sorted.forEach((entry, index) => {
    const angle = (2 * Math.PI * index) / sorted.length;
    layout[entry.name] = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });

  return layout;
}

function computeBoundingBox(
  nodes: string[],
  layout: Record<string, Position>,
  fallback: Record<string, Position>
) {
  if (!nodes.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: CANVAS_WIDTH,
      maxY: CANVAS_HEIGHT,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  nodes.forEach((name) => {
    const position = layout[name] ?? fallback[name];
    if (!position) return;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x);
    maxY = Math.max(maxY, position.y);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      minX: 0,
      minY: 0,
      maxX: CANVAS_WIDTH,
      maxY: CANVAS_HEIGHT,
    };
  }

  return { minX, minY, maxX, maxY };
}

function useFitToViewTransform(
  nodes: string[],
  layout: Record<string, Position>,
  fallback: Record<string, Position>
) {
  return useMemo(() => {
    const padding = 40;
    const box = computeBoundingBox(nodes, layout, fallback);
    const width = Math.max(box.maxX - box.minX, 1);
    const height = Math.max(box.maxY - box.minY, 1);
    const availableWidth = CANVAS_WIDTH - padding * 2;
    const availableHeight = CANVAS_HEIGHT - padding * 2;
    const scale = Math.min(availableWidth / width, availableHeight / height, 2);
    const offsetX = -box.minX * scale + (CANVAS_WIDTH - width * scale) / 2;
    const offsetY = -box.minY * scale + (CANVAS_HEIGHT - height * scale) / 2;

    return {
      scale,
      offsetX,
      offsetY,
    };
  }, [nodes, layout, fallback]);
}

const CallGraph: React.FC<CallGraphProps> = ({
  func,
  callers = [],
  onSelect,
  funcMap,
  xrefs,
  prefersReducedMotion = false,
}) => {
  const fullLayout = useMemo(() => computeFullLayout(funcMap), [funcMap]);
  const callersMap = useMemo(() => buildCallersMap(funcMap, xrefs), [funcMap, xrefs]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([ROOT_CRUMB]);
  const graphNavigationRef = useRef(false);
  const focusCrumb = breadcrumbs[breadcrumbs.length - 1];
  const focusNode = focusCrumb === ROOT_CRUMB ? null : focusCrumb;
  const visibleNodes = useMemo(
    () => getVisibleNodes(focusNode, funcMap, callersMap, callers),
    [focusNode, funcMap, callersMap, callers]
  );

  useEffect(() => {
    const name = func?.name;
    if (!name) {
      setBreadcrumbs([ROOT_CRUMB]);
      return;
    }
    if (graphNavigationRef.current) {
      graphNavigationRef.current = false;
      return;
    }
    setBreadcrumbs([ROOT_CRUMB, name]);
  }, [func?.name]);

  const layout = useMemo(() => {
    if (!focusNode) {
      return fullLayout;
    }
    return {
      ...fullLayout,
      ...computeSubgraphLayout(focusNode, visibleNodes, fullLayout),
    };
  }, [focusNode, fullLayout, visibleNodes]);

  const transform = useFitToViewTransform(visibleNodes, layout, fullLayout);

  const edges = useMemo(() => {
    const nodeSet = new Set(visibleNodes);
    if (!focusNode) {
      const fullEdges: Array<{ source: string; target: string; type: 'any' }> = [];
      Object.values(funcMap ?? {}).forEach((fn) => {
        (fn.calls ?? []).forEach((callee) => {
          if (nodeSet.has(fn.name) && nodeSet.has(callee)) {
            fullEdges.push({ source: fn.name, target: callee, type: 'any' });
          }
        });
      });
      return fullEdges;
    }

    const focusEdges: Array<{ source: string; target: string; type: 'in' | 'out' }> = [];
    (funcMap?.[focusNode]?.calls ?? []).forEach((callee) => {
      if (nodeSet.has(callee)) {
        focusEdges.push({ source: focusNode, target: callee, type: 'out' });
      }
    });
    (callersMap[focusNode] ?? []).forEach((caller) => {
      if (nodeSet.has(caller)) {
        focusEdges.push({ source: caller, target: focusNode, type: 'in' });
      }
    });

    return focusEdges;
  }, [visibleNodes, focusNode, funcMap, callersMap]);

  const handleNodeSelect = (name: string) => {
    if (!name) return;
    setBreadcrumbs((prev) => {
      const existingIndex = prev.indexOf(name);
      if (existingIndex >= 0) {
        return prev.slice(0, existingIndex + 1);
      }
      return [...prev, name];
    });
    graphNavigationRef.current = true;
    onSelect?.(name);
  };

  const handleBreadcrumbClick = (crumb: string, index: number) => {
    if (index === breadcrumbs.length - 1) {
      return;
    }
    if (crumb === ROOT_CRUMB) {
      setBreadcrumbs([ROOT_CRUMB]);
      return;
    }
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    graphNavigationRef.current = true;
    onSelect?.(crumb);
  };

  const selectedName = func?.name;

  return (
    <div className="w-full h-full flex flex-col bg-black text-white">
      <nav
        aria-label="Call graph navigation"
        className="flex items-center gap-1 px-2 py-1 text-xs border-b border-gray-800 bg-gray-900/60"
      >
        {breadcrumbs.map((crumb, index) => {
          const isActive = index === breadcrumbs.length - 1;
          const label = crumb === ROOT_CRUMB ? 'Full graph' : crumb;
          return (
            <React.Fragment key={`${crumb}-${index}`}>
              {index > 0 && <span className="text-gray-500">/</span>}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(crumb, index)}
                disabled={isActive}
                className={`disabled:cursor-default disabled:text-gray-200 ${
                  isActive
                    ? 'font-semibold'
                    : 'text-blue-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400'
                }`}
              >
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <svg
        role="img"
        aria-label={focusNode ? `Call graph around ${focusNode}` : 'Call graph'}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="flex-1 w-full h-full bg-black"
      >
        <g
          transform={`translate(${transform.offsetX} ${transform.offsetY}) scale(${transform.scale})`}
          style={{
            transition: prefersReducedMotion ? undefined : 'transform 200ms ease-out',
            transformOrigin: 'center center',
          }}
        >
          {edges.map((edge) => {
            const from = layout[edge.source];
            const to = layout[edge.target];
            if (!from || !to) return null;
            const stroke =
              edge.type === 'out'
                ? '#4ade80'
                : edge.type === 'in'
                ? '#f87171'
                : '#6b7280';
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
          {visibleNodes.map((name) => {
            const position = layout[name] ?? fullLayout[name];
            if (!position) return null;
            const isFocus = name === focusNode;
            const isSelected = name === selectedName;
            const fill = isFocus
              ? '#2563eb'
              : isSelected
              ? '#1e3a8a'
              : '#374151';
            return (
              <g
                key={name}
                className="cursor-pointer"
                onClick={() => handleNodeSelect(name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNodeSelect(name);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isFocus}
              >
                <circle cx={position.x} cy={position.y} r={16} fill={fill} stroke="#9ca3af" />
                <text
                  x={position.x}
                  y={position.y + 4}
                  textAnchor="middle"
                  className="text-[10px] fill-white"
                >
                  {name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default CallGraph;
