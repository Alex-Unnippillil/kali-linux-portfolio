import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Annotation,
  AnnotationAction,
  AnnotationState,
  CaptureMode,
  Point,
  SelectionRect,
  clampRect,
  normalizeRect,
} from './annotations';

const TOOLBAR_HEIGHT = 48;
const MAGNIFIER_SIZE = 140;
const MAGNIFIER_ZOOM = 4;
const DEFAULT_COLOR = '#38bdf8';
const TEXT_BACKGROUND = 'rgba(15, 23, 42, 0.8)';
const TEXT_COLOR = '#e2e8f0';

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type OverlayTool = 'select' | 'arrow' | 'rect' | 'text' | 'blur';

interface SelectionOverlayProps {
  open: boolean;
  imageSrc: string | null;
  mode: CaptureMode;
  annotationState: AnnotationState;
  dispatch: React.Dispatch<AnnotationAction>;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
  onClose: () => void;
  onConfirm: (result: {
    dataUrl: string;
    selection: SelectionRect | null;
    annotations: Annotation[];
  }) => void;
  onModeHotkey: (mode: CaptureMode) => void;
}

const toolLabels: Record<OverlayTool, string> = {
  select: 'Region',
  arrow: 'Arrow',
  rect: 'Box',
  text: 'Text',
  blur: 'Blur',
};

const isInputElement = (target: EventTarget | null): boolean => {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target as HTMLElement | null)?.isContentEditable === true
  );
};

const getPointerPosition = (
  event: React.PointerEvent<HTMLCanvasElement> | PointerEvent,
  canvas: HTMLCanvasElement,
): Point => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
};

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'arrow' }>,
  origin: Point,
) => {
  const startX = annotation.start.x - origin.x;
  const startY = annotation.start.y - origin.y;
  const endX = annotation.end.x - origin.x;
  const endY = annotation.end.y - origin.y;
  const headLength = 12;
  const angle = Math.atan2(endY - startY, endX - startX);

  ctx.save();
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.lineTo(endX, endY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawRect = (
  ctx: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'rect' }>,
  origin: Point,
  highlighted: boolean,
) => {
  const x = annotation.x - origin.x;
  const y = annotation.y - origin.y;
  ctx.save();
  ctx.strokeStyle = highlighted ? '#f97316' : annotation.color;
  ctx.lineWidth = highlighted ? 3 : 2;
  ctx.strokeRect(x, y, annotation.width, annotation.height);
  ctx.restore();
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'text' }>,
  origin: Point,
) => {
  const x = annotation.x - origin.x;
  const y = annotation.y - origin.y;
  ctx.save();
  ctx.font = '16px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText(annotation.text);
  const paddingX = 8;
  const paddingY = 4;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 20 + paddingY * 2;
  ctx.fillStyle = annotation.background;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.fillStyle = annotation.color;
  ctx.fillText(annotation.text, x + paddingX, y + paddingY);
  ctx.restore();
};

const drawBlur = (
  ctx: CanvasRenderingContext2D,
  annotation: Extract<Annotation, { type: 'blur' }>,
  origin: Point,
  image: HTMLImageElement | null,
  highlighted: boolean,
) => {
  if (!image || annotation.width <= 0 || annotation.height <= 0) return;
  const x = annotation.x - origin.x;
  const y = annotation.y - origin.y;
  const temp = document.createElement('canvas');
  temp.width = annotation.width;
  temp.height = annotation.height;
  const tempCtx = temp.getContext('2d');
  if (!tempCtx) return;
  tempCtx.filter = `blur(${annotation.intensity}px)`;
  tempCtx.drawImage(
    image,
    annotation.x,
    annotation.y,
    annotation.width,
    annotation.height,
    0,
    0,
    annotation.width,
    annotation.height,
  );
  ctx.drawImage(temp, x, y);
  if (highlighted) {
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, annotation.width, annotation.height);
    ctx.restore();
  }
};

const drawAnnotations = (
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  image: HTMLImageElement | null,
  origin: Point,
  selectedId: string | null,
) => {
  annotations.forEach((annotation) => {
    if (annotation.type === 'arrow') {
      drawArrow(ctx, annotation, origin);
      return;
    }
    if (annotation.type === 'rect') {
      drawRect(ctx, annotation, origin, annotation.id === selectedId);
      return;
    }
    if (annotation.type === 'text') {
      drawText(ctx, annotation, origin);
      return;
    }
    if (annotation.type === 'blur') {
      drawBlur(ctx, annotation, origin, image, annotation.id === selectedId);
    }
  });
};

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  open,
  imageSrc,
  mode,
  annotationState,
  dispatch,
  selection,
  onSelectionChange,
  onClose,
  onConfirm,
  onModeHotkey,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const magnifierRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [activeTool, setActiveTool] = useState<OverlayTool>('select');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const activeAnnotationIdRef = useRef<string | null>(null);
  const [magnifierPosition, setMagnifierPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveTool('select');
      dragStartRef.current = null;
      activeAnnotationIdRef.current = null;
      setMagnifierPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!imageSrc) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageSrc;
    return () => {
      setImage(null);
    };
  }, [imageSrc, open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.width;
    canvas.height = image.height;
  }, [image]);

  const bounds = useMemo(() => {
    if (!image) return { width: 0, height: 0 };
    return { width: image.width, height: image.height };
  }, [image]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
      ctx.drawImage(image, 0, 0);
    }
    if (selection && selection.width > 0 && selection.height > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      ctx.restore();
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
      ctx.restore();
    }
    drawAnnotations(
      ctx,
      annotationState.annotations,
      image,
      { x: 0, y: 0 },
      annotationState.selectedId,
    );
  }, [annotationState.annotations, annotationState.selectedId, image, selection]);

  useEffect(() => {
    if (!open) return;
    renderCanvas();
  }, [open, renderCanvas]);

  const updateMagnifier = useCallback(
    (point: Point, event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = magnifierRef.current;
      if (!canvas || !image) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const sourceSize = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
      const sx = Math.max(
        0,
        Math.min(image.width - sourceSize, point.x - sourceSize / 2),
      );
      const sy = Math.max(
        0,
        Math.min(image.height - sourceSize, point.y - sourceSize / 2),
      );
      canvas.width = MAGNIFIER_SIZE;
      canvas.height = MAGNIFIER_SIZE;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
      ctx.drawImage(
        image,
        sx,
        sy,
        sourceSize,
        sourceSize,
        0,
        0,
        MAGNIFIER_SIZE,
        MAGNIFIER_SIZE,
      );
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
      setMagnifierPosition({
        x: Math.min(event.clientX + 24, window.innerWidth - MAGNIFIER_SIZE - 16),
        y: Math.min(event.clientY + 24, window.innerHeight - MAGNIFIER_SIZE - 16),
      });
    },
    [image],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!open) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(event.pointerId);
      setIsDragging(true);
      const point = getPointerPosition(event, canvas);
      dragStartRef.current = point;

      if (activeTool === 'select') {
        onSelectionChange({ x: point.x, y: point.y, width: 0, height: 0 });
        return;
      }

      if (activeTool === 'text') {
        const text = window.prompt('Annotation text');
        canvas.releasePointerCapture(event.pointerId);
        if (!text) {
          setIsDragging(false);
          return;
        }
        const annotation: Annotation = {
          id: createId(),
          type: 'text',
          color: TEXT_COLOR,
          x: point.x,
          y: point.y,
          text,
          background: TEXT_BACKGROUND,
        };
        dispatch({ type: 'ADD', annotation });
        renderCanvas();
        setIsDragging(false);
        return;
      }

      const id = createId();
      if (activeTool === 'arrow') {
        const annotation: Annotation = {
          id,
          type: 'arrow',
          color: DEFAULT_COLOR,
          start: point,
          end: point,
        };
        dispatch({ type: 'ADD', annotation });
        activeAnnotationIdRef.current = id;
        return;
      }
      if (activeTool === 'rect') {
        const annotation: Annotation = {
          id,
          type: 'rect',
          color: DEFAULT_COLOR,
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
        };
        dispatch({ type: 'ADD', annotation });
        activeAnnotationIdRef.current = id;
        return;
      }
      if (activeTool === 'blur') {
        const annotation: Annotation = {
          id,
          type: 'blur',
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          intensity: 6,
        };
        dispatch({ type: 'ADD', annotation });
        activeAnnotationIdRef.current = id;
      }
    },
    [activeTool, dispatch, onSelectionChange, open, renderCanvas],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!open) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const point = getPointerPosition(event, canvas);
      updateMagnifier(point, event.nativeEvent);
      if (!isDragging || !dragStartRef.current) {
        return;
      }
      if (activeTool === 'select') {
        const draft = normalizeRect({
          x: dragStartRef.current.x,
          y: dragStartRef.current.y,
          width: point.x - dragStartRef.current.x,
          height: point.y - dragStartRef.current.y,
        });
        const constrained = clampRect(draft, bounds);
        onSelectionChange(constrained);
        renderCanvas();
        return;
      }
      const activeId = activeAnnotationIdRef.current;
      if (!activeId) return;
      if (activeTool === 'arrow') {
        dispatch({
          type: 'UPDATE',
          id: activeId,
          changes: {
            end: {
              x: Math.max(0, Math.min(point.x, bounds.width)),
              y: Math.max(0, Math.min(point.y, bounds.height)),
            },
          } as Partial<Annotation>,
        });
        renderCanvas();
        return;
      }
      const width = Math.max(0, Math.min(point.x, bounds.width)) - dragStartRef.current.x;
      const height =
        Math.max(0, Math.min(point.y, bounds.height)) - dragStartRef.current.y;
      const rect = normalizeRect({
        x: dragStartRef.current.x,
        y: dragStartRef.current.y,
        width,
        height,
      });
      dispatch({
        type: 'UPDATE',
        id: activeId,
        changes: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        } as Partial<Annotation>,
      });
      renderCanvas();
    },
    [activeTool, bounds, dispatch, isDragging, onSelectionChange, open, renderCanvas, updateMagnifier],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!open) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.releasePointerCapture(event.pointerId);
      setIsDragging(false);
      dragStartRef.current = null;
      if (activeTool === 'select') {
        if (!selection || selection.width < 4 || selection.height < 4) {
          onSelectionChange(null);
        } else {
          const constrained = clampRect(selection, bounds);
          onSelectionChange(constrained);
        }
        renderCanvas();
        return;
      }
      const activeId = activeAnnotationIdRef.current;
      activeAnnotationIdRef.current = null;
      if (!activeId) return;
      const annotation = annotationState.annotations.find(
        (item) => item.id === activeId,
      );
      if (!annotation) return;
      if (annotation.type === 'arrow') {
        if (
          Math.hypot(
            annotation.end.x - annotation.start.x,
            annotation.end.y - annotation.start.y,
          ) < 8
        ) {
          dispatch({ type: 'REMOVE', id: annotation.id });
        }
        renderCanvas();
        return;
      }
      if (annotation.type === 'rect' || annotation.type === 'blur') {
        if (annotation.width < 8 || annotation.height < 8) {
          dispatch({ type: 'REMOVE', id: annotation.id });
        }
        renderCanvas();
      }
    },
    [activeTool, annotationState.annotations, bounds, dispatch, onSelectionChange, open, renderCanvas, selection],
  );

  const handlePointerLeave = useCallback(() => {
    setMagnifierPosition(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!canvasRef.current || !image) return;
    const hasSelection =
      selection && selection.width > 0 && selection.height > 0;
    const region = hasSelection
      ? clampRect(selection, bounds)
      : { x: 0, y: 0, width: bounds.width, height: bounds.height };
    const exportWidth = Math.max(1, Math.round(region.width));
    const exportHeight = Math.max(1, Math.round(region.height));
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;
    exportCtx.drawImage(
      image,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      exportWidth,
      exportHeight,
    );
    drawAnnotations(
      exportCtx,
      annotationState.annotations,
      image,
      { x: region.x, y: region.y },
      null,
    );
    const dataUrl = exportCanvas.toDataURL('image/png');
    onConfirm({
      dataUrl,
      selection: hasSelection ? region : null,
      annotations: annotationState.annotations,
    });
  }, [annotationState.annotations, annotationState.selectedId, bounds, image, onConfirm, selection]);

  useEffect(() => {
    if (!open) return;
    const keyListener = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (annotationState.selectedId) {
          event.preventDefault();
          dispatch({ type: 'REMOVE', id: annotationState.selectedId });
          renderCanvas();
        }
      }
      if (event.shiftKey) {
        const key = event.key.toLowerCase();
        const mapping: Record<string, CaptureMode> = {
          s: 'screen',
          w: 'window',
          r: 'region',
        };
        const modeKey = mapping[key];
        if (modeKey) {
          event.preventDefault();
          onModeHotkey(modeKey);
        }
      }
    };
    window.addEventListener('keydown', keyListener);
    return () => window.removeEventListener('keydown', keyListener);
  }, [annotationState.selectedId, dispatch, handleConfirm, onClose, onModeHotkey, open, renderCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleClick = (event: MouseEvent) => {
      if (!canvas || !open) return;
      const point = getPointerPosition(event as unknown as PointerEvent, canvas);
      const hit = annotationState.annotations.find((annotation) => {
        if (annotation.type === 'arrow') {
          const distance = Math.hypot(
            annotation.end.x - annotation.start.x,
            annotation.end.y - annotation.start.y,
          );
          if (distance < 6) return false;
          const t =
            ((point.x - annotation.start.x) *
              (annotation.end.x - annotation.start.x) +
              (point.y - annotation.start.y) *
                (annotation.end.y - annotation.start.y)) /
            Math.max(distance ** 2, 1);
          if (t < 0 || t > 1) return false;
          const projX = annotation.start.x +
            t * (annotation.end.x - annotation.start.x);
          const projY = annotation.start.y +
            t * (annotation.end.y - annotation.start.y);
          return Math.hypot(point.x - projX, point.y - projY) <= 8;
        }
        if (annotation.type === 'text') {
          const ctx = canvas.getContext('2d');
          if (!ctx) return false;
          ctx.font = '16px Inter, system-ui, sans-serif';
          const metrics = ctx.measureText(annotation.text);
          const width = metrics.width + 16;
          const height = 28;
          return (
            point.x >= annotation.x &&
            point.x <= annotation.x + width &&
            point.y >= annotation.y &&
            point.y <= annotation.y + height
          );
        }
        const rect = {
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height,
        };
        return (
          point.x >= rect.x &&
          point.x <= rect.x + rect.width &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.height
        );
      });
      if (hit) {
        dispatch({ type: 'SELECT', id: hit.id });
      } else {
        dispatch({ type: 'SELECT', id: null });
      }
      renderCanvas();
    };
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [annotationState.annotations, dispatch, open, renderCanvas]);

  if (!open || !image) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 rounded bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-lg">
        <p className="font-semibold text-slate-100">
          Region capture ({mode.toUpperCase()})
        </p>
        <p>
          Hotkeys: Shift+S screen, Shift+W window, Shift+R region, Enter confirm,
          Esc cancel
        </p>
      </div>
      <div className="relative max-h-[88vh] max-w-[92vw] overflow-hidden rounded-lg border border-slate-700 bg-slate-950/40 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          style={{ maxWidth: '92vw', maxHeight: `calc(88vh - ${TOOLBAR_HEIGHT}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
        {magnifierPosition && (
          <canvas
            ref={magnifierRef}
            className="pointer-events-none absolute rounded border border-slate-600 shadow-lg"
            style={{
              width: MAGNIFIER_SIZE,
              height: MAGNIFIER_SIZE,
              left: magnifierPosition.x,
              top: magnifierPosition.y,
            }}
          />
        )}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-sky-400"
          >
            Use selection
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-700/80 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
        <div className="absolute top-4 left-4 flex h-10 items-center gap-2 rounded-full bg-slate-900/90 px-4 text-xs text-slate-200 shadow-lg">
          {(Object.keys(toolLabels) as OverlayTool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setActiveTool(tool)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                activeTool === tool
                  ? 'bg-sky-500 text-slate-900 shadow'
                  : 'bg-transparent text-slate-200 hover:bg-slate-800'
              }`}
            >
              {toolLabels[tool]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectionOverlay;
