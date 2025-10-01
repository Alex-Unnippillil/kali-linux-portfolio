import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type HeatmapPoint = {
  x: number;
  y: number;
  value: number;
  radius?: number;
  label?: string;
};

export type ColorStop = {
  value: number;
  color: string;
};

export type HeatmapProps = {
  data: HeatmapPoint[];
  width?: number;
  height?: number;
  minValue?: number;
  maxValue?: number;
  colorStops?: ColorStop[];
  ariaLabel?: string;
  onBrushSelection?: (points: HeatmapPoint[]) => void;
  renderLegend?: boolean;
};

export type BrushState = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type ViewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_COLOR_STOPS: ColorStop[] = [
  { value: 0, color: '#0f172a' },
  { value: 0.25, color: '#1d4ed8' },
  { value: 0.5, color: '#22d3ee' },
  { value: 0.75, color: '#facc15' },
  { value: 1, color: '#f97316' },
];

type RGBA = [number, number, number, number];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const parseColor = (color: string): RGBA => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b, 255];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b, 255];
    }
  }
  if (typeof document === 'undefined') {
    return [0, 0, 0, 255];
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return [0, 0, 0, 255];
  }
  ctx.fillStyle = color;
  const computed = ctx.fillStyle as string;
  const match = computed.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    return [0, 0, 0, 255];
  }
  const parts = match[1]
    .split(',')
    .map((part) => parseFloat(part.trim()));
  const [r, g, b, a] = [
    parts[0] || 0,
    parts[1] || 0,
    parts[2] || 0,
    parts.length === 4 ? Math.round((parts[3] || 0) * 255) : 255,
  ];
  return [r, g, b, a];
};

const lerp = (start: number, end: number, t: number) =>
  start + (end - start) * t;

const lerpColor = (a: RGBA, b: RGBA, t: number): RGBA => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
  Math.round(lerp(a[3], b[3], t)),
];

const rgbaToCss = (rgba: RGBA) =>
  `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] / 255})`;

export const createColorScale = (stops: ColorStop[] = DEFAULT_COLOR_STOPS) => {
  if (!stops.length) {
    return () => rgbaToCss([0, 0, 0, 255]);
  }
  const sorted = [...stops].sort((a, b) => a.value - b.value);
  const parsed = sorted.map((stop) => ({
    value: stop.value,
    rgba: parseColor(stop.color),
  }));
  return (value: number) => {
    const min = parsed[0].value;
    const max = parsed[parsed.length - 1].value;
    const clampedValue = clamp(value, min, max);
    let lower = parsed[0];
    let upper = parsed[parsed.length - 1];
    for (let i = 0; i < parsed.length; i += 1) {
      if (parsed[i].value <= clampedValue) {
        lower = parsed[i];
      }
      if (parsed[i].value >= clampedValue) {
        upper = parsed[i];
        break;
      }
    }
    if (lower === upper) {
      return rgbaToCss(lower.rgba);
    }
    const range = upper.value - lower.value || 1;
    const t = (clampedValue - lower.value) / range;
    return rgbaToCss(lerpColor(lower.rgba, upper.rgba, t));
  };
};

export const meetsPerformanceBudget = (
  frameDurations: number[],
  targetFps = 50
) => {
  if (!frameDurations.length) return true;
  const averageDuration =
    frameDurations.reduce((acc, value) => acc + value, 0) /
    frameDurations.length;
  if (averageDuration <= 0) return true;
  const effectiveFps = 1000 / averageDuration;
  return effectiveFps >= targetFps;
};

export const computeBrushSelection = (
  data: HeatmapPoint[],
  brush: BrushState | null,
  view: ViewTransform,
  dimensions: { width: number; height: number }
) => {
  if (!brush) return [];
  const { startX, startY, endX, endY } = brush;
  const minX = Math.min(startX, endX);
  const minY = Math.min(startY, endY);
  const maxX = Math.max(startX, endX);
  const maxY = Math.max(startY, endY);
  const selected: HeatmapPoint[] = [];
  for (const point of data) {
    const baseX = point.x * dimensions.width;
    const baseY = point.y * dimensions.height;
    const displayX = baseX * view.scale + view.offsetX;
    const displayY = baseY * view.scale + view.offsetY;
    const radius = (point.radius || 24) * view.scale;
    const left = displayX - radius;
    const right = displayX + radius;
    const top = displayY - radius;
    const bottom = displayY + radius;
    const intersects =
      right >= minX &&
      left <= maxX &&
      bottom >= minY &&
      top <= maxY;
    if (intersects) {
      selected.push(point);
    }
  }
  return selected;
};

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return undefined;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);
  return prefersReducedMotion;
};

const Heatmap: React.FC<HeatmapProps> = ({
  data,
  width = 640,
  height = 360,
  minValue,
  maxValue,
  colorStops = DEFAULT_COLOR_STOPS,
  ariaLabel = 'Heatmap of script execution intensity',
  onBrushSelection,
  renderLegend = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<ViewTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [brush, setBrush] = useState<BrushState | null>(null);
  const [fps, setFps] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const frameDurationsRef = useRef<number[]>([]);
  const pointerModeRef = useRef<'pan' | 'brush' | null>(null);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const brushRef = useRef<BrushState | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const colorScale = useMemo(() => createColorScale(colorStops), [colorStops]);

  const valueRange = useMemo(() => {
    if (!data.length) {
      return { min: 0, max: 1 };
    }
    const values = data.map((item) => item.value);
    const computedMin = minValue ?? Math.min(...values);
    const computedMax = maxValue ?? Math.max(...values);
    if (computedMin === computedMax) {
      return { min: computedMin, max: computedMax + 1 };
    }
    return { min: computedMin, max: computedMax };
  }, [data, minValue, maxValue]);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const devicePixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const scaledData = data.map((point) => {
      const normalizedValue =
        valueRange.max - valueRange.min === 0
          ? 0
          : (point.value - valueRange.min) / (valueRange.max - valueRange.min);
      const color = colorScale(normalizedValue);
      return {
        point,
        color,
      };
    });

    const getDisplayCoordinates = (point: HeatmapPoint) => {
      const baseX = point.x * width * view.scale + view.offsetX;
      const baseY = point.y * height * view.scale + view.offsetY;
      return {
        x: baseX * devicePixelRatio,
        y: baseY * devicePixelRatio,
        radius: (point.radius || 24) * view.scale * devicePixelRatio,
      };
    };

    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    }) as WebGLRenderingContext | null;

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute float a_radius;
        varying vec4 v_color;
        uniform vec2 u_resolution;
        void main() {
          vec2 zeroToOne = a_position / u_resolution;
          vec2 clipSpace = zeroToOne * 2.0 - 1.0;
          gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
          gl_PointSize = a_radius;
          v_color = a_color;
        }
      `;
      const fragmentShaderSource = `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.5, 0.3, dist);
          gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
        }
      `;

      const compileShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = compileShader(
        gl.FRAGMENT_SHADER,
        fragmentShaderSource
      );
      if (vertexShader && fragmentShader) {
        const program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            const positionLocation = gl.getAttribLocation(program, 'a_position');
            const colorLocation = gl.getAttribLocation(program, 'a_color');
            const radiusLocation = gl.getAttribLocation(program, 'a_radius');
            const resolutionLocation = gl.getUniformLocation(
              program,
              'u_resolution'
            );

            const positions = new Float32Array(scaledData.length * 2);
            const colors = new Float32Array(scaledData.length * 4);
            const radii = new Float32Array(scaledData.length);
            scaledData.forEach(({ point, color }, index) => {
              const { x, y, radius } = getDisplayCoordinates(point);
              positions[index * 2] = x;
              positions[index * 2 + 1] = y;
              const parsedColor = parseColor(color);
              colors[index * 4] = parsedColor[0] / 255;
              colors[index * 4 + 1] = parsedColor[1] / 255;
              colors[index * 4 + 2] = parsedColor[2] / 255;
              colors[index * 4 + 3] = parsedColor[3] / 255;
              radii[index] = radius;
            });

            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            const colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(colorLocation);
            gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

            const radiusBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, radiusBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, radii, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(radiusLocation);
            gl.vertexAttribPointer(radiusLocation, 1, gl.FLOAT, false, 0, 0);

            if (resolutionLocation) {
              gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
            }

            gl.drawArrays(gl.POINTS, 0, scaledData.length);
          }
          gl.deleteProgram(program);
        }
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      }
      return;
    }

    const supportsOffscreen =
      typeof window !== 'undefined' && 'OffscreenCanvas' in window;
    const targetCanvas = supportsOffscreen
      ? new OffscreenCanvas(canvas.width, canvas.height)
      : canvas;
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const { point, color } of scaledData) {
      const { x, y, radius } = getDisplayCoordinates(point);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    if (supportsOffscreen && targetCanvas instanceof OffscreenCanvas) {
      const bitmap = targetCanvas.transferToImageBitmap();
      const visibleCtx = canvas.getContext('2d');
      if (visibleCtx) {
        if (typeof visibleCtx.transferFromImageBitmap === 'function') {
          // @ts-ignore
          visibleCtx.transferFromImageBitmap(bitmap);
        } else {
          visibleCtx.clearRect(0, 0, canvas.width, canvas.height);
          visibleCtx.drawImage(bitmap, 0, 0);
        }
      }
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
    }
  }, [canvasRef, colorScale, data, height, valueRange, view, width]);

  const scheduleDraw = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      animationFrameRef.current = null;
      if (lastTimestampRef.current !== null) {
        const duration = timestamp - lastTimestampRef.current;
        frameDurationsRef.current.push(duration);
        if (frameDurationsRef.current.length > 24) {
          frameDurationsRef.current.shift();
        }
        if (frameDurationsRef.current.length >= 5) {
          const meetsBudget = meetsPerformanceBudget(
            frameDurationsRef.current,
            50
          );
          const averageDuration =
            frameDurationsRef.current.reduce(
              (acc, value) => acc + value,
              0
            ) / frameDurationsRef.current.length;
          setFps(Math.round(1000 / averageDuration));
          if (!meetsBudget && !reducedMotion) {
            setView((prev) => ({
              scale: clamp(prev.scale * 0.95, 0.5, 8),
              offsetX: prev.offsetX * 0.95,
              offsetY: prev.offsetY * 0.95,
            }));
          }
        }
      }
      lastTimestampRef.current = timestamp;
      drawHeatmap();
    });
  }, [drawHeatmap, reducedMotion]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleDraw]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const originX = event.clientX - rect.left;
      const originY = event.clientY - rect.top;
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setView((prev) => {
        const nextScale = clamp(prev.scale * delta, 0.5, 8);
        if (reducedMotion) {
          return { ...prev, scale: nextScale };
        }
        const scaleRatio = nextScale / prev.scale;
        const offsetX = originX - (originX - prev.offsetX) * scaleRatio;
        const offsetY = originY - (originY - prev.offsetY) * scaleRatio;
        return {
          scale: nextScale,
          offsetX,
          offsetY,
        };
      });
      scheduleDraw();
    },
    [scheduleDraw, reducedMotion]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointerOriginRef.current = { x, y };
      pointerModeRef.current = event.shiftKey ? 'brush' : 'pan';
      if (pointerModeRef.current === 'brush') {
        const nextBrush = { startX: x, startY: y, endX: x, endY: y };
        brushRef.current = nextBrush;
        setBrush(nextBrush);
      }
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerOriginRef.current || !pointerModeRef.current) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (pointerModeRef.current === 'pan') {
        const { x: originX, y: originY } = pointerOriginRef.current;
        setView((prev) => ({
          scale: prev.scale,
          offsetX: prev.offsetX + (x - originX),
          offsetY: prev.offsetY + (y - originY),
        }));
        pointerOriginRef.current = { x, y };
      } else {
        const current = brushRef.current || {
          startX: x,
          startY: y,
          endX: x,
          endY: y,
        };
        const nextBrush = {
          ...current,
          endX: x,
          endY: y,
        };
        brushRef.current = nextBrush;
        setBrush(nextBrush);
      }
      scheduleDraw();
    },
    [scheduleDraw]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (pointerModeRef.current === 'brush') {
        const selection = computeBrushSelection(data, brushRef.current, view, {
          width,
          height,
        });
        if (selection.length && onBrushSelection) {
          onBrushSelection(selection);
        }
      }
      pointerModeRef.current = null;
      pointerOriginRef.current = null;
      setBrush(null);
      brushRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [data, view, width, height, onBrushSelection]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (event.key === '+' || event.key === '=') {
        setView((prev) => ({
          ...prev,
          scale: clamp(prev.scale * 1.1, 0.5, 8),
        }));
        scheduleDraw();
        event.preventDefault();
      } else if (event.key === '-' || event.key === '_') {
        setView((prev) => ({
          ...prev,
          scale: clamp(prev.scale * 0.9, 0.5, 8),
        }));
        scheduleDraw();
        event.preventDefault();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const delta = reducedMotion ? 16 : 32;
        setView((prev) => ({
          ...prev,
          offsetX:
            event.key === 'ArrowLeft'
              ? prev.offsetX + delta
              : event.key === 'ArrowRight'
              ? prev.offsetX - delta
              : prev.offsetX,
          offsetY:
            event.key === 'ArrowUp'
              ? prev.offsetY + delta
              : event.key === 'ArrowDown'
              ? prev.offsetY - delta
              : prev.offsetY,
        }));
        scheduleDraw();
        event.preventDefault();
      }
    },
    [scheduleDraw, reducedMotion]
  );

  const legendGradient = useMemo(() => {
    const stops = colorStops
      .slice()
      .sort((a, b) => a.value - b.value)
      .map((stop) => `${stop.color} ${Math.round(stop.value * 100)}%`)
      .join(', ');
    return `linear-gradient(90deg, ${stops})`;
  }, [colorStops]);

  const instructionsId = 'heatmap-controls';
  const fpsAnnouncementId = 'heatmap-fps';

  return (
    <figure className="flex flex-col gap-3" aria-labelledby={instructionsId}>
      <div className="relative flex flex-col gap-2">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={`${instructionsId} ${fpsAnnouncementId}`}
          tabIndex={0}
          className="rounded-md border border-slate-700 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onKeyDown={handleKeyDown}
        />
        {brush ? (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${Math.min(brush.startX, brush.endX)}px`,
              top: `${Math.min(brush.startY, brush.endY)}px`,
              width: `${Math.abs(brush.endX - brush.startX)}px`,
              height: `${Math.abs(brush.endY - brush.startY)}px`,
              border: '1px solid rgba(56, 189, 248, 0.7)',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
            }}
          />
        ) : null}
      </div>
      <figcaption className="space-y-2 text-sm text-slate-300">
        <div id={instructionsId}>
          Use the mouse wheel or <kbd className="rounded bg-slate-800 px-1">+</kbd> /{' '}
          <kbd className="rounded bg-slate-800 px-1">-</kbd> to zoom. Hold{' '}
          <kbd className="rounded bg-slate-800 px-1">Shift</kbd> and drag to brush
          select hosts. Arrow keys pan the view. This visualization respects your
          reduced-motion preference.
        </div>
        <div
          id={fpsAnnouncementId}
          aria-live="polite"
          className="text-xs text-slate-400"
        >
          {fps ? `Estimated frame rate: ${fps} fps.` : 'Collecting performance data…'}
        </div>
        {renderLegend ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Low</span>
              <span>High</span>
            </div>
            <div
              aria-hidden="true"
              className="h-2 w-full rounded-full"
              style={{ backgroundImage: legendGradient }}
            />
          </div>
        ) : null}
      </figcaption>
    </figure>
  );
};

export default Heatmap;
