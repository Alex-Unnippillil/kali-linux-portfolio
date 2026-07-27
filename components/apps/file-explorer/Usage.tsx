'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface UsageProps {
  root: FileSystemDirectoryHandle | null;
  className?: string;
  title?: string;
}

interface UsageNode {
  name: string;
  size: number;
  path: string;
  kind: FileSystemHandle['kind'];
  children?: UsageNode[];
}

interface TreemapRect {
  node: UsageNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

const THRESHOLD_STORAGE_KEY = 'file-explorer:quota-threshold';
const DEFAULT_THRESHOLD = 0.82; // default warning at 82%

const abortError = () => {
  const error = new Error('Aborted');
  (error as Error & { name: string }).name = 'AbortError';
  return error;
};

const isAbortError = (error: unknown): boolean => {
  return (
    !!error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${
    units[exponent]
  }`;
};

const makeFrameThrottler = (frameBudget = 16) => {
  let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return async () => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - last >= frameBudget) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          last =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
          resolve();
        }),
      );
    }
  };
};

const ensureNotAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw abortError();
  }
};

const computeDirectory = async (
  dir: FileSystemDirectoryHandle,
  signal: AbortSignal,
  throttler: () => Promise<void>,
  path: string,
): Promise<UsageNode> => {
  ensureNotAborted(signal);

  const children: UsageNode[] = [];
  let totalSize = 0;
  const iterator: AsyncIterableIterator<[string, FileSystemHandle]> | null =
    typeof (dir as any).entries === 'function'
      ? (dir as any).entries()
      : null;

  if (!iterator) {
    return {
      name: dir.name,
      size: 0,
      path,
      kind: 'directory',
      children: [],
    };
  }

  for await (const entry of iterator) {
    ensureNotAborted(signal);
    await throttler();

    const [name, handle] = Array.isArray(entry)
      ? entry
      : [entry?.[0] ?? (entry as any)?.name ?? 'unknown', entry?.[1] ?? entry];

    if (!handle) continue;

    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      ensureNotAborted(signal);
      const file = await fileHandle.getFile();
      ensureNotAborted(signal);
      const size = file.size ?? 0;
      totalSize += size;
      children.push({
        name,
        size,
        path: `${path}/${name}`,
        kind: 'file',
      });
    } else if (handle.kind === 'directory') {
      const dirHandle = handle as FileSystemDirectoryHandle;
      const childNode = await computeDirectory(
        dirHandle,
        signal,
        throttler,
        `${path}/${name}`,
      );
      totalSize += childNode.size;
      children.push(childNode);
    }
  }

  children.sort((a, b) => b.size - a.size);

  return {
    name: dir.name ?? path.split('/').pop() ?? 'root',
    size: totalSize,
    path,
    kind: 'directory',
    children,
  };
};

const layoutTreemap = (
  node: UsageNode,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
): TreemapRect[] => {
  if (!node.children?.length || width <= 0 || height <= 0) {
    return [];
  }

  const total = node.children.reduce((sum, child) => sum + child.size, 0);
  if (total <= 0) {
    return [];
  }

  const horizontal = depth % 2 === 0;
  let offset = 0;
  const rects: TreemapRect[] = [];

  for (const child of node.children) {
    if (child.size <= 0) continue;
    const ratio = child.size / total;

    if (horizontal) {
      const childWidth = width * ratio;
      const rect: TreemapRect = {
        node: child,
        x: x + offset,
        y,
        width: childWidth,
        height,
        depth: depth + 1,
      };
      rects.push(rect);
      rects.push(
        ...layoutTreemap(child, rect.x, rect.y, rect.width, rect.height, depth + 1),
      );
      offset += childWidth;
    } else {
      const childHeight = height * ratio;
      const rect: TreemapRect = {
        node: child,
        x,
        y: y + offset,
        width,
        height: childHeight,
        depth: depth + 1,
      };
      rects.push(rect);
      rects.push(
        ...layoutTreemap(child, rect.x, rect.y, rect.width, rect.height, depth + 1),
      );
      offset += childHeight;
    }
  }

  return rects;
};

const findNodeByPath = (root: UsageNode | null, path: string | null): UsageNode | null => {
  if (!root || !path) return root;
  if (root.path === path) return root;

  const queue: UsageNode[] = [root];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.path === path) return current;
    if (current.children?.length) {
      queue.push(...current.children);
    }
  }
  return root;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const Usage: React.FC<UsageProps> = ({ root, className, title }) => {
  const [tree, setTree] = useState<UsageNode | null>(null);
  const [computing, setComputing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ready' | 'scanning' | 'cancelled' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<TreemapRect | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointer = useRef<{ x: number; y: number } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const rectsRef = useRef<TreemapRect[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>(
    () => ({ width: 640, height: 360 }),
  );
  const [quotaInfo, setQuotaInfo] = useState<{ quota: number; usage: number } | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(THRESHOLD_STORAGE_KEY);
      if (stored) {
        const value = parseFloat(stored);
        if (Number.isFinite(value)) {
          setThreshold(clamp(value, 0.5, 0.98));
        }
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        THRESHOLD_STORAGE_KEY,
        clamp(threshold, 0.5, 0.98).toFixed(2),
      );
    } catch {
      // ignore storage failures
    }
  }, [threshold]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(200, Math.floor(rect.width));
      const height = Math.max(200, Math.floor(rect.height));
      setCanvasSize({ width, height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const treeSize = tree?.size;
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setQuotaInfo(null);
      return () => {
        cancelled = true;
      };
    }

    navigator.storage
      .estimate()
      .then((info) => {
        if (!cancelled) {
          setQuotaInfo({ quota: info.quota ?? 0, usage: info.usage ?? 0 });
        }
      })
      .catch(() => {
        if (!cancelled) setQuotaInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [treeSize, computing]);

  const cancelComputation = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  const startComputation = useCallback(async () => {
    if (!root) {
      cancelComputation();
      setTree(null);
      setStatus('idle');
      setError(null);
      return;
    }

    cancelComputation();
    const controller = new AbortController();
    controllerRef.current = controller;

    setComputing(true);
    setStatus('scanning');
    setError(null);

    const throttler = makeFrameThrottler();

    try {
      const result = await computeDirectory(root, controller.signal, throttler, `/${
        root.name || 'root'
      }`);
      if (!controller.signal.aborted) {
        setTree(result);
        setStatus('ready');
        setFocusPath(result.path);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error(err);
        setError('Failed to compute directory usage.');
        setStatus('error');
      } else {
        setStatus('cancelled');
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      setComputing(false);
    }
  }, [root, cancelComputation]);

  useEffect(() => {
    startComputation();
    return () => {
      cancelComputation();
    };
  }, [startComputation, cancelComputation]);

  const focusNode = useMemo(() => findNodeByPath(tree, focusPath), [tree, focusPath]);

  const treemapRects = useMemo(() => {
    if (!focusNode) {
      rectsRef.current = [];
      return [];
    }
    const rects = layoutTreemap(
      focusNode,
      0,
      0,
      canvasSize.width,
      canvasSize.height,
      0,
    );
    rectsRef.current = rects;
    return rects;
  }, [focusNode, canvasSize.height, canvasSize.width]);

  const scheduleDraw = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const rects = rectsRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const { width, height } = canvasSize;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.save();
      context.scale(dpr, dpr);
      context.clearRect(0, 0, width, height);

      rects.forEach((rect) => {
        const { node, x, y, width: w, height: h, depth } = rect;
        const hue = (depth * 47) % 360;
        const saturation = clamp(65 - depth * 4, 35, 75);
        const lightness = clamp(45 + depth * 3, 30, 70);
        context.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
        context.fillRect(x, y, w, h);

        if (hoverRect && hoverRect.node.path === node.path) {
          context.fillStyle = 'rgba(0, 0, 0, 0.18)';
          context.fillRect(x, y, w, h);
        }

        if (w > 60 && h > 36) {
          context.fillStyle = 'rgba(0,0,0,0.55)';
          context.fillRect(x, y, w, 22);
          context.fillStyle = '#f7f7f7';
          context.font = '12px "Inter", system-ui, sans-serif';
          context.textBaseline = 'top';
          context.fillText(node.name, x + 6, y + 4, w - 12);
          context.fillStyle = 'rgba(255,255,255,0.75)';
          context.font = '11px "Inter", system-ui, sans-serif';
          context.fillText(formatBytes(node.size), x + 6, y + 16, w - 12);
        }
      });

      if (hoverRect) {
        context.strokeStyle = 'rgba(255,255,255,0.9)';
        context.lineWidth = 2;
        context.strokeRect(
          hoverRect.x + 1,
          hoverRect.y + 1,
          hoverRect.width - 2,
          hoverRect.height - 2,
        );
      }

      context.restore();
    });
  }, [canvasSize, hoverRect]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scheduleDraw, treemapRects]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointer = (clientX: number, clientY: number) => {
      const bounds = canvas.getBoundingClientRect();
      const x = clamp(clientX - bounds.left, 0, bounds.width);
      const y = clamp(clientY - bounds.top, 0, bounds.height);

      const rect = rectsRef.current.find(
        (r) =>
          x >= r.x &&
          x <= r.x + r.width &&
          y >= r.y &&
          y <= r.y + r.height,
      );

      setHoverRect(rect ?? null);
      if (rect) {
        setHoverPos({ x, y });
      } else {
        setHoverPos(null);
      }
    };

    const onPointerMove = (event: PointerEvent | MouseEvent) => {
      pendingPointer.current = { x: event.clientX, y: event.clientY };
      if (pointerFrameRef.current) return;
      pointerFrameRef.current = requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        if (!pendingPointer.current) return;
        const point = pendingPointer.current;
        pendingPointer.current = null;
        handlePointer(point.x, point.y);
      });
    };

    const onPointerLeave = () => {
      pendingPointer.current = null;
      if (pointerFrameRef.current) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
      setHoverRect(null);
      setHoverPos(null);
    };

    const onClick = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = clamp(event.clientX - bounds.left, 0, bounds.width);
      const y = clamp(event.clientY - bounds.top, 0, bounds.height);
      const rect = rectsRef.current.find(
        (r) =>
          x >= r.x &&
          x <= r.x + r.width &&
          y >= r.y &&
          y <= r.y + r.height,
      );
      if (rect && rect.node.kind === 'directory' && rect.node.children?.length) {
        setFocusPath(rect.node.path);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      if (pointerFrameRef.current) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
    };
  }, [canvasRef, setFocusPath]);

  const goUp = useCallback(() => {
    if (!focusNode || focusNode.path === tree?.path) {
      setFocusPath(tree?.path ?? null);
      return;
    }
    if (!tree) return;
    const segments = focusNode.path.split('/').filter(Boolean);
    if (segments.length <= 1) {
      setFocusPath(tree.path);
      return;
    }
    const parentPath = `/${segments.slice(0, segments.length - 1).join('/')}`;
    setFocusPath(parentPath);
  }, [focusNode, tree]);

  const usageRatio = useMemo(() => {
    if (!quotaInfo || !quotaInfo.quota) return 0;
    const usage = Math.max(quotaInfo.usage, tree?.size ?? 0);
    return clamp(usage / quotaInfo.quota, 0, 1);
  }, [quotaInfo, tree?.size]);

  const warningLevel = useMemo(() => {
    if (!quotaInfo?.quota) return null;
    if (usageRatio >= 0.97) return 'critical';
    if (usageRatio >= threshold) return 'warning';
    return null;
  }, [usageRatio, threshold, quotaInfo?.quota]);

  const breadcrumbs = useMemo(() => {
    if (!focusNode) return [] as { name: string; path: string }[];
    const segments = focusNode.path.split('/').filter(Boolean);
    const crumbs: { name: string; path: string }[] = [];
    for (let i = 0; i < segments.length; i += 1) {
      const path = `/${segments.slice(0, i + 1).join('/')}`;
      crumbs.push({ name: segments[i], path });
    }
    return crumbs;
  }, [focusNode]);

  const totalSize = focusNode?.size ?? 0;

  return (
    <div
      className={
        className ??
        'flex flex-col gap-4 rounded-lg border border-neutral-700/80 bg-neutral-900/50 p-4 text-neutral-100'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {title ?? 'Storage usage'}
          </h2>
          <p className="text-sm text-neutral-400">
            Visualise how space is distributed across your filesystem and track quota thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startComputation}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={computing || !root}
          >
            {computing ? 'Scanning…' : 'Rescan'}
          </button>
          <button
            type="button"
            onClick={cancelComputation}
            className="rounded border border-neutral-600 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!computing}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-neutral-200">Quota threshold:</span>
          <span className="text-neutral-300">{Math.round(threshold * 100)}%</span>
          <input
            type="range"
            min={0.5}
            max={0.98}
            step={0.01}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            className="h-1 w-40 cursor-pointer accent-blue-500"
            aria-valuemin={0.5}
            aria-valuemax={0.98}
            aria-valuenow={threshold}
            aria-valuetext={`${Math.round(threshold * 100)} percent`}
            aria-label="Quota threshold"
          />
        </label>
        {quotaInfo?.quota ? (
          <div className="flex flex-col text-right text-sm text-neutral-300">
            <span>
              Usage: {formatBytes(Math.max(quotaInfo.usage, tree?.size ?? 0))} /{' '}
              {formatBytes(quotaInfo.quota)}
            </span>
            <span>({Math.round(usageRatio * 100)}%)</span>
          </div>
        ) : (
          <span className="text-neutral-500">
            Quota information unavailable in this browser.
          </span>
        )}
      </div>

      {warningLevel && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            warningLevel === 'critical'
              ? 'border-red-500/60 bg-red-500/10 text-red-200'
              : 'border-amber-500/60 bg-amber-500/10 text-amber-200'
          }`}
        >
          {warningLevel === 'critical'
            ? 'Storage is critically full. Free up space or increase your quota to avoid write failures.'
            : 'Storage usage is approaching your configured threshold. Consider cleaning up large directories.'}
        </div>
      )}

      {error && (
        <div className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <button
          type="button"
          onClick={goUp}
          className="rounded border border-neutral-600 px-2 py-1 text-xs uppercase tracking-wide text-neutral-200 transition hover:bg-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-neutral-400"
        >
          Up one level
        </button>
        <div className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <button
                type="button"
                onClick={() => setFocusPath(crumb.path)}
                className={`rounded px-1.5 py-0.5 font-medium transition focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                  crumb.path === focusNode?.path
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700/80'
                }`}
              >
                {crumb.name || '/'}
              </button>
              {index < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="ml-auto text-xs uppercase tracking-wide text-neutral-500">
          Total: {formatBytes(totalSize)}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[360px] w-full overflow-hidden rounded-md border border-neutral-700/80 bg-neutral-950/50"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          role="img"
          aria-label="Treemap visualising storage usage"
        />
        {hoverRect && hoverPos && (
          <div
            className="pointer-events-none absolute min-w-[160px] max-w-[240px] rounded-md border border-neutral-700 bg-neutral-900/95 p-2 text-xs text-neutral-200 shadow-xl"
            style={{
              left: clamp(hoverPos.x + 16, 0, canvasSize.width - 200),
              top: clamp(hoverPos.y + 16, 0, canvasSize.height - 120),
            }}
          >
            <div className="font-semibold text-neutral-100">{hoverRect.node.name}</div>
            <div className="text-neutral-300">{hoverRect.node.path}</div>
            <div className="text-neutral-300">{formatBytes(hoverRect.node.size)}</div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-neutral-500">
              {hoverRect.node.kind === 'directory'
                ? `${hoverRect.node.children?.length ?? 0} items`
                : 'File'}
            </div>
          </div>
        )}
        {!treemapRects.length && status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
            No data found in this directory.
          </div>
        )}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/60 text-sm text-neutral-300">
            Calculating usage…
          </div>
        )}
      </div>
    </div>
  );
};

export default Usage;
