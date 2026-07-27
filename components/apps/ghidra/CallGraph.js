import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const SIZE = 200;
const CENTER = { x: SIZE / 2, y: SIZE / 2 };
const RADIUS = 70;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 1.1;
const KEYBOARD_PAN_STEP = 20;

export default function CallGraph({ func, callers = [], onSelect }) {
  const svgRef = useRef(null);
  const panState = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const neighbors = useMemo(
    () => Array.from(new Set([...(func?.calls || []), ...callers])),
    [callers, func?.calls],
  );

  const positions = useMemo(() => {
    const map = {};
    neighbors.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / neighbors.length;
      map[n] = {
        x: CENTER.x + RADIUS * Math.cos(angle),
        y: CENTER.y + RADIUS * Math.sin(angle),
      };
    });
    return map;
  }, [neighbors]);

  const outgoing = useMemo(() => new Set(func?.calls || []), [func?.calls]);
  const incoming = useMemo(() => new Set(callers), [callers]);

  const clampScale = useCallback((value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)), []);

  const fitToView = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();

      setTransform((prev) => {
        const svgElement = svgRef.current;
        if (!svgElement) {
          return prev;
        }

        const factor = event.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP;
        const nextScale = clampScale(prev.scale * factor);
        if (nextScale === prev.scale) {
          return prev;
        }

        const rect = svgElement.getBoundingClientRect();
        const svgPointX = ((event.clientX - rect.left) / rect.width) * SIZE;
        const svgPointY = ((event.clientY - rect.top) / rect.height) * SIZE;
        const graphX = (svgPointX - prev.x) / prev.scale;
        const graphY = (svgPointY - prev.y) / prev.scale;
        const nextX = svgPointX - nextScale * graphX;
        const nextY = svgPointY - nextScale * graphY;

        return {
          scale: nextScale,
          x: nextX,
          y: nextY,
        };
      });
    },
    [clampScale],
  );

  const handlePointerDown = useCallback((event) => {
    if (event.button !== 0) {
      return;
    }

    if (event.target instanceof Element && event.target.closest('[data-node]')) {
      return;
    }

    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    panState.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (typeof svgElement.setPointerCapture === 'function') {
      try {
        svgElement.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore errors in environments without pointer capture support
      }
    }
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!panState.current || panState.current.pointerId !== event.pointerId) {
      return;
    }

    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    event.preventDefault();
    const rect = svgElement.getBoundingClientRect();

    setTransform((prev) => {
      const unitPerPixelX = SIZE / rect.width;
      const unitPerPixelY = SIZE / rect.height;
      const deltaX = (event.clientX - panState.current.clientX) * unitPerPixelX;
      const deltaY = (event.clientY - panState.current.clientY) * unitPerPixelY;

      panState.current.clientX = event.clientX;
      panState.current.clientY = event.clientY;

      return {
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      };
    });
  }, []);

  const handlePointerUp = useCallback((event) => {
    if (!panState.current || panState.current.pointerId !== event.pointerId) {
      return;
    }

    const svgElement = svgRef.current;
    if (svgElement && typeof svgElement.releasePointerCapture === 'function') {
      try {
        svgElement.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore errors when pointer capture cannot be released
      }
    }

    panState.current = null;
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      const unitPerPixelX = rect ? SIZE / rect.width : 1;
      const unitPerPixelY = rect ? SIZE / rect.height : 1;
      const deltaX = KEYBOARD_PAN_STEP * unitPerPixelX;
      const deltaY = KEYBOARD_PAN_STEP * unitPerPixelY;

      setTransform((prev) => {
        switch (event.key) {
          case 'ArrowUp':
            return { ...prev, y: prev.y - deltaY };
          case 'ArrowDown':
            return { ...prev, y: prev.y + deltaY };
          case 'ArrowLeft':
            return { ...prev, x: prev.x - deltaX };
          case 'ArrowRight':
            return { ...prev, x: prev.x + deltaX };
          default:
            return prev;
        }
      });
    }
  }, []);

  const handleNodeKeyDown = useCallback(
    (name) => (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (onSelect) {
          onSelect(name);
        }
      }
    },
    [onSelect],
  );

  const funcName = func?.name || 'Current function';

  return (
    <div
      data-testid="call-graph-controller"
      className="w-full h-full bg-black relative"
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      role="application"
      aria-label="Call graph viewer"
      tabIndex={0}
    >
      <button
        type="button"
        onClick={fitToView}
        className="absolute right-2 top-2 z-10 rounded bg-gray-800 px-2 py-1 text-xs text-white shadow focus:outline-none focus-visible:ring"
      >
        Fit to view
      </button>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Call graph"
        data-testid="call-graph-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g
          data-testid="call-graph-content"
          transform={`matrix(${transform.scale} 0 0 ${transform.scale} ${transform.x} ${transform.y})`}
          style={{
            transition: prefersReducedMotion ? 'none' : 'transform 150ms ease-out',
            transformOrigin: '0 0',
            transformBox: 'fill-box',
          }}
        >
          {(func?.calls || []).map((c) => (
            <line
              key={`out-${c}`}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={positions[c]?.x}
              y2={positions[c]?.y}
              stroke="#4ade80"
              strokeWidth={2}
            >
              <title>{`${funcName} calls ${c}`}</title>
            </line>
          ))}
          {callers.map((c) => (
            <line
              key={`in-${c}`}
              x1={positions[c]?.x}
              y1={positions[c]?.y}
              x2={CENTER.x}
              y2={CENTER.y}
              stroke="#f87171"
              strokeWidth={2}
            >
              <title>{`${c} calls ${funcName}`}</title>
            </line>
          ))}
          <g aria-label={`${funcName} node`}>
            <circle cx={CENTER.x} cy={CENTER.y} r={20} className="fill-blue-600" />
            <text
              x={CENTER.x}
              y={CENTER.y + 4}
              textAnchor="middle"
              className="fill-white text-xs"
            >
              {func?.name || 'func'}
            </text>
          </g>
          {neighbors.map((n) => {
            const parts = [];
            if (outgoing.has(n)) {
              parts.push(`${funcName} calls this function.`);
            }
            if (incoming.has(n)) {
              parts.push(`This function calls ${funcName}.`);
            }
            const label = [`Function ${n}.`, ...parts].join(' ');
            return (
              <g
                key={n}
                data-node="true"
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => onSelect && onSelect(n)}
                onKeyDown={handleNodeKeyDown(n)}
              >
                <circle cx={positions[n]?.x} cy={positions[n]?.y} r={15} className="fill-gray-700" />
                <text
                  x={positions[n]?.x}
                  y={positions[n]?.y + 4}
                  textAnchor="middle"
                  className="fill-white text-xs"
                >
                  {n}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
