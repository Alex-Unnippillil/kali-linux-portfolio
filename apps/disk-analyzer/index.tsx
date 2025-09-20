'use client';

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, ListChildComponentProps } from 'react-window';
import {
  DiskNode,
  DiskScanProgress,
  DiskScanRequestMessage,
  DiskScanResponseMessage,
} from '@/types/disk';
import { exportDiskUsage, formatBytes } from '@/utils/export';
import { isBrowser } from '@/utils/isBrowser';
import {
  buildArcPath,
  colorForNode,
  computeSunburst,
  computeTreemap,
  TreemapRect,
  SunburstArc,
} from './layout';
import { sampleDiskData } from './sampleData';

interface VirtualListData {
  items: DiskNode[];
  parentSize: number;
  onSelect: (node: DiskNode) => void;
  onDrill: (node: DiskNode) => void;
  selectedId: string | null;
}

const mergeNodes = (base: DiskNode, incoming: DiskNode): DiskNode => {
  if (base.id === incoming.id) {
    return incoming;
  }
  if (!base.children || base.children.length === 0) {
    return base;
  }
  let changed = false;
  const children = base.children.map((child) => {
    if (child.id === incoming.id || incoming.id.startsWith(`${child.id}/`)) {
      const merged = mergeNodes(child, incoming);
      if (merged !== child) changed = true;
      return merged;
    }
    return child;
  });
  return changed ? { ...base, children } : base;
};

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const TreemapView: React.FC<{
  root: DiskNode;
  highlightId: string | null;
  onSelect: (node: DiskNode) => void;
  onHover: (node: DiskNode | null) => void;
}> = ({ root, highlightId, onSelect, onHover }) => (
  <AutoSizer>
    {({ width, height }) => {
      if (!width || !height) {
        return <div className="flex h-full items-center justify-center text-sm text-gray-300">No data</div>;
      }
      return (
        <TreemapCanvas
          width={width}
          height={height}
          root={root}
          highlightId={highlightId}
          onSelect={onSelect}
          onHover={onHover}
        />
      );
    }}
  </AutoSizer>
);

const TreemapCanvas: React.FC<{
  width: number;
  height: number;
  root: DiskNode;
  highlightId: string | null;
  onSelect: (node: DiskNode) => void;
  onHover: (node: DiskNode | null) => void;
}> = ({ width, height, root, highlightId, onSelect, onHover }) => {
  const rects = useMemo<TreemapRect[]>(() => computeTreemap(root, width, height), [root, width, height]);

  if (!rects.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-300">
        Not enough data to build a treemap yet.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md bg-black/30">
      {rects.map((rect) => {
        if (rect.width < 8 || rect.height < 8) return null;
        const area = rect.width * rect.height;
        const isHighlighted = rect.node.id === highlightId;
        const color = colorForNode(rect.node, rect.depth);
        const showLabel = area > 2800;
        const percent = root.size > 0 ? (rect.node.size / root.size) * 100 : 0;
        return (
          <button
            key={`${rect.node.id}-${rect.depth}`}
            type="button"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            className={`absolute overflow-hidden rounded-sm border border-white/10 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
              isHighlighted ? 'ring-2 ring-ub-orange' : 'hover:border-white/30'
            }`}
            onClick={() => onSelect(rect.node)}
            onMouseEnter={() => onHover(rect.node)}
            onMouseLeave={() => onHover(null)}
            title={`${rect.node.name}\n${formatBytes(rect.node.size)} · ${formatPercent(percent)}`}
          >
            <div
              className="h-full w-full"
              style={{
                background: color,
                mixBlendMode: 'screen',
              }}
            />
            {showLabel && (
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1 text-[11px] text-black/80">
                <span className="truncate font-semibold drop-shadow">{rect.node.name}</span>
                <span className="text-[10px] font-medium drop-shadow">
                  {formatBytes(rect.node.size)} · {formatPercent(percent)}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

const SunburstView: React.FC<{
  root: DiskNode;
  highlightId: string | null;
  onSelect: (node: DiskNode) => void;
  onHover: (node: DiskNode | null) => void;
}> = ({ root, highlightId, onSelect, onHover }) => (
  <AutoSizer>
    {({ width, height }) => {
      if (!width || !height) {
        return <div className="flex h-full items-center justify-center text-sm text-gray-300">No data</div>;
      }
      const size = Math.min(width, height);
      return (
        <SunburstCanvas
          width={width}
          height={height}
          radius={size / 2 - 8}
          root={root}
          highlightId={highlightId}
          onSelect={onSelect}
          onHover={onHover}
        />
      );
    }}
  </AutoSizer>
);

const SunburstCanvas: React.FC<{
  width: number;
  height: number;
  radius: number;
  root: DiskNode;
  highlightId: string | null;
  onSelect: (node: DiskNode) => void;
  onHover: (node: DiskNode | null) => void;
}> = ({ width, height, radius, root, highlightId, onSelect, onHover }) => {
  const arcs = useMemo<SunburstArc[]>(() => computeSunburst(root, Math.max(0, radius), 6), [root, radius]);

  if (!arcs.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-300">
        Not enough data to build a sunburst yet.
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      role="presentation"
      className="rounded-md bg-black/30"
    >
      {arcs.map((arc) => {
        const path = buildArcPath(arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle);
        const percent = root.size > 0 ? (arc.node.size / root.size) * 100 : 0;
        const highlighted = arc.node.id === highlightId;
        return (
          <path
            key={`${arc.node.id}-${arc.depth}`}
            d={path}
            fill={colorForNode(arc.node, arc.depth)}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={highlighted ? 2 : 1}
            className="cursor-pointer transition focus:outline-none"
            onClick={() => onSelect(arc.node)}
            onMouseEnter={() => onHover(arc.node)}
            onMouseLeave={() => onHover(null)}
            aria-label={`${arc.node.name} ${formatBytes(arc.node.size)} (${formatPercent(percent)})`}
          >
            <title>
              {arc.node.name} · {formatBytes(arc.node.size)} · {formatPercent(percent)}
            </title>
          </path>
        );
      })}
    </svg>
  );
};

const Row: React.FC<ListChildComponentProps<VirtualListData>> = ({ index, style, data }) => {
  const item = data.items[index];
  if (!item) return null;
  const percent = data.parentSize > 0 ? (item.size / data.parentSize) * 100 : 0;
  const isSelected = data.selectedId === item.id;
  return (
    <div
      style={style}
      className={`flex items-center justify-between gap-2 px-3 text-sm ${
        isSelected ? 'bg-ub-orange/20 text-white' : 'text-gray-100'
      }`}
    >
      <button
        type="button"
        onClick={() => data.onSelect(item)}
        className="flex flex-1 flex-col items-start truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
      >
        <span className="truncate font-medium">{item.name}</span>
        <span className="text-xs text-gray-300">
          {formatBytes(item.size)} · {formatPercent(percent)}
        </span>
      </button>
      {item.type === 'directory' && (
        <button
          type="button"
          onClick={() => data.onDrill(item)}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
        >
          Open
        </button>
      )}
    </div>
  );
};

const buildNodeIndex = (root: DiskNode): Map<string, DiskNode> => {
  const map = new Map<string, DiskNode>();
  const traverse = (node: DiskNode) => {
    map.set(node.id, node);
    node.children?.forEach(traverse);
  };
  traverse(root);
  return map;
};

const cloneSample = (node: DiskNode): DiskNode => {
  if (typeof structuredClone === 'function') {
    return structuredClone(node) as DiskNode;
  }
  return JSON.parse(JSON.stringify(node)) as DiskNode;
};

const DiskAnalyzerApp: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const [root, setRoot] = useState<DiskNode | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<DiskScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nodeIndex, setNodeIndex] = useState<Map<string, DiskNode>>(new Map());
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DiskNode | null>(null);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    if (!isBrowser || typeof Worker === 'undefined') return terminateWorker;
    const worker = new Worker(new URL('../../workers/diskScan.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<DiskScanResponseMessage>) => {
      const { data } = event;
      if (!data) return;
      if (data.type === 'progress') {
        setProgress(data.progress);
      } else if (data.type === 'chunk') {
        setRoot((prev) => {
          if (!prev) {
            return data.node.parentId ? prev : data.node;
          }
          return mergeNodes(prev, data.node);
        });
      } else if (data.type === 'complete') {
        setProgress(data.progress);
        setRoot(data.root);
        setStatus('ready');
        setError(null);
      } else if (data.type === 'error') {
        setStatus('error');
        setError(data.error);
      } else if (data.type === 'cancelled') {
        setStatus('idle');
      }
    };
    return terminateWorker;
  }, [terminateWorker]);

  useEffect(() => {
    if (!root) {
      setNodeIndex(new Map());
      setCurrentPath(null);
      setSelectedPath(null);
      return;
    }
    const map = buildNodeIndex(root);
    setNodeIndex(map);
    setCurrentPath((prev) => (prev && map.has(prev) ? prev : root.id));
    setSelectedPath((prev) => (prev && map.has(prev) ? prev : root.id));
  }, [root]);

  const currentNode = useMemo(() => {
    if (!currentPath) return root ?? null;
    return nodeIndex.get(currentPath) ?? null;
  }, [currentPath, nodeIndex, root]);

  const selectedNode = useMemo(() => {
    if (selectedPath) return nodeIndex.get(selectedPath) ?? null;
    return currentNode;
  }, [selectedPath, nodeIndex, currentNode]);

  const focusNode = hoveredNode ?? selectedNode ?? currentNode ?? root;

  const handleSelect = useCallback((node: DiskNode) => {
    setSelectedPath(node.id);
    if (node.type === 'directory') {
      setCurrentPath(node.id);
    }
  }, []);

  const handleDrill = useCallback((node: DiskNode) => {
    if (node.type !== 'directory') return;
    setCurrentPath(node.id);
    setSelectedPath(node.id);
  }, []);

  const handleBreadcrumb = useCallback((id: string) => {
    setCurrentPath(id);
    setSelectedPath(id);
  }, []);

  const handleExport = useCallback(() => {
    if (!root) return;
    exportDiskUsage(root, {
      filename: `disk-usage-${new Date().toISOString()}.csv`,
      download: true,
    });
  }, [root]);

  const handleLoadSample = useCallback(() => {
    const clone = cloneSample(sampleDiskData);
    setRoot(clone);
    setStatus('ready');
    setProgress(null);
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' } satisfies DiskScanRequestMessage);
    setStatus('idle');
  }, []);

  const handleScan = useCallback(async () => {
    if (!isBrowser) {
      setError('Disk scanning is only available in the browser.');
      setStatus('error');
      return;
    }
    const picker = (
      window as typeof window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      setError('Your browser does not support the File System Access API.');
      setStatus('error');
      return;
    }
    try {
      const handle = await picker();
      if (!handle) return;
      if (!workerRef.current) {
        setError('Scanning worker is not available.');
        return;
      }
      setRoot(null);
      setStatus('scanning');
      setError(null);
      setProgress(null);
      setSelectedPath(null);
      setCurrentPath(null);
      const message: DiskScanRequestMessage = {
        type: 'start',
        handle,
        options: {
          chunkSize: 64,
        },
      };
      workerRef.current.postMessage(message);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
      console.error('Failed to open directory', err);
      setError('Unable to access the selected directory.');
      setStatus('error');
    }
  }, []);

  const breadcrumbs = useMemo(() => {
    if (!currentNode || !nodeIndex.size) return [] as { id: string; label: string }[];
    const crumbs: { id: string; label: string }[] = [];
    let node: DiskNode | undefined | null = currentNode;
    while (node) {
      crumbs.unshift({ id: node.id, label: node.path.length === 0 ? node.name : node.name });
      node = node.parentId ? nodeIndex.get(node.parentId) ?? null : null;
    }
    if (!crumbs.length && root) {
      crumbs.push({ id: root.id, label: root.name });
    }
    return crumbs;
  }, [currentNode, nodeIndex, root]);

  const listItems = useMemo(() => currentNode?.children ?? [], [currentNode]);
  const listHeight = Math.max(200, Math.min(360, listItems.length * 48 || 200));

  const listData = useMemo<VirtualListData>(
    () => ({
      items: listItems,
      parentSize: currentNode?.size ?? 0,
      onSelect: handleSelect,
      onDrill: handleDrill,
      selectedId: selectedNode?.id ?? null,
    }),
    [listItems, currentNode?.size, handleSelect, handleDrill, selectedNode?.id],
  );

  const progressDuration = progress ? (progress.updatedAt - progress.startedAt) / 1000 : 0;
  const throughput = progressDuration > 0 ? formatBytes(progress.bytes / progressDuration) : '0 B';
  const highlightId = focusNode?.id ?? null;

  const topConsumers = useMemo(() => {
    if (!root?.children?.length) return [] as DiskNode[];
    return [...root.children].sort((a, b) => b.size - a.size).slice(0, 5);
  }, [root]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <header className="border-b border-black/40 bg-black/30 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Disk Analyzer</h1>
            <p className="text-sm text-gray-300">
              Visualise disk usage with treemap and sunburst layouts, then drill into large folders.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleScan}
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Scan directory
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="rounded border border-white/30 px-4 py-2 text-sm text-white transition hover:border-white/60 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Load sample data
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!root}
              className="rounded border border-white/30 px-4 py-2 text-sm text-white transition hover:border-white/60 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange disabled:cursor-not-allowed disabled:border-white/10 disabled:text-gray-400"
            >
              Export CSV
            </button>
            {status === 'scanning' && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded border border-red-400 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Cancel scan
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {progress && (
          <div className="mt-4 grid gap-3 text-xs text-gray-200 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded bg-black/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Files scanned</p>
              <p className="text-base font-semibold">{progress.files.toLocaleString()}</p>
            </div>
            <div className="rounded bg-black/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Folders traversed</p>
              <p className="text-base font-semibold">{progress.directories.toLocaleString()}</p>
            </div>
            <div className="rounded bg-black/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Bytes measured</p>
              <p className="text-base font-semibold">{formatBytes(progress.bytes)}</p>
            </div>
            <div className="rounded bg-black/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Throughput</p>
              <p className="text-base font-semibold">{throughput}/s</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <section className="flex min-h-[260px] flex-1 flex-col gap-2 rounded-lg bg-black/20 p-3" onMouseLeave={() => setHoveredNode(null)}>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Treemap</span>
              <span className="text-xs font-normal text-gray-300">Click on a block to explore a folder</span>
            </div>
            <div className="relative flex-1">
              {currentNode ? (
                <TreemapView
                  root={currentNode}
                  highlightId={highlightId}
                  onSelect={handleSelect}
                  onHover={setHoveredNode}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-300">
                  Start a scan or load the sample dataset.
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-[260px] flex-1 flex-col gap-2 rounded-lg bg-black/20 p-3" onMouseLeave={() => setHoveredNode(null)}>
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Sunburst</span>
              <span className="text-xs font-normal text-gray-300">Hover to inspect usage, click to focus</span>
            </div>
            <div className="relative flex-1">
              {currentNode ? (
                <SunburstView
                  root={currentNode}
                  highlightId={highlightId}
                  onSelect={handleSelect}
                  onHover={setHoveredNode}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-300">
                  Start a scan or load the sample dataset.
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-lg bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Directory contents</h2>
              {currentNode?.parentId && (
                <button
                  type="button"
                  onClick={() => handleBreadcrumb(currentNode.parentId!)}
                  className="rounded border border-white/20 px-2 py-1 text-xs text-white transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
                >
                  Go up
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-gray-300">
              {breadcrumbs.length ? (
                breadcrumbs.map((crumb, idx) => (
                  <Fragment key={crumb.id}>
                    {idx > 0 && <span>/</span>}
                    <button
                      type="button"
                      onClick={() => handleBreadcrumb(crumb.id)}
                      className={`rounded px-1 py-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                        currentPath === crumb.id ? 'bg-ub-orange text-black' : 'hover:bg-white/10'
                      }`}
                    >
                      {crumb.label}
                    </button>
                  </Fragment>
                ))
              ) : (
                <span>/</span>
              )}
            </div>
            <div className="rounded-md border border-white/10 bg-black/30">
              {listItems.length ? (
                <List
                  height={listHeight}
                  itemCount={listItems.length}
                  itemSize={48}
                  width="100%"
                  itemData={listData}
                >
                  {Row}
                </List>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-300">
                  No files in this folder.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="flex w-full flex-shrink-0 flex-col gap-4 lg:w-80">
          <section className="rounded-lg bg-black/20 p-4">
            <h2 className="text-sm font-semibold">Selection details</h2>
            {focusNode ? (
              <dl className="mt-3 space-y-2 text-xs text-gray-200">
                <div>
                  <dt className="text-gray-400">Name</dt>
                  <dd className="font-semibold text-white">{focusNode.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Path</dt>
                  <dd className="break-all text-white/90">{focusNode.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Size</dt>
                  <dd className="text-white">
                    {formatBytes(focusNode.size)} ({formatPercent(root?.size ? (focusNode.size / root.size) * 100 : 0)})
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Contains</dt>
                  <dd className="text-white">
                    {focusNode.fileCount.toLocaleString()} files · {focusNode.dirCount.toLocaleString()} directories
                  </dd>
                </div>
                {focusNode.modified && (
                  <div>
                    <dt className="text-gray-400">Last modified</dt>
                    <dd className="text-white">{new Date(focusNode.modified).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-gray-300">Select a file or folder to inspect details.</p>
            )}
          </section>

          {topConsumers.length > 0 && (
            <section className="rounded-lg bg-black/20 p-4">
              <h2 className="text-sm font-semibold">Largest items</h2>
              <ul className="mt-3 space-y-2 text-xs text-gray-200">
                {topConsumers.map((node) => (
                  <li key={node.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelect(node)}
                      className="truncate text-left text-white hover:underline"
                    >
                      {node.name}
                    </button>
                    <span className="text-gray-300">{formatBytes(node.size)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
};

export default DiskAnalyzerApp;
