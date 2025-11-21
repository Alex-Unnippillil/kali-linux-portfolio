"use client";

import React, {
  RefObject,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import usePersistentState from '../../../hooks/usePersistentState';

export type AnnotationType = 'highlight' | 'note' | 'drawing';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnnotationBase {
  id: string;
  type: AnnotationType;
  page: number;
  color: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight';
  rect: Rect;
  comment: string;
}

export interface NoteAnnotation extends AnnotationBase {
  type: 'note';
  position: Point;
  text: string;
}

export interface DrawingAnnotation extends AnnotationBase {
  type: 'drawing';
  points: Point[];
  comment: string;
}

export type Annotation =
  | HighlightAnnotation
  | NoteAnnotation
  | DrawingAnnotation;

type AnnotationTool = 'select' | 'highlight' | 'note' | 'drawing';

type CollaborationEvent = {
  type: 'sync';
  annotations: Annotation[];
  sessionId: string;
};

interface AnnotProps {
  documentId: string;
  page: number;
  pageCount: number;
  containerRef: RefObject<HTMLElement | null>;
  initialAnnotations?: Annotation[];
  onJumpToPage?: (page: number) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}

type PointerState =
  | { type: 'highlight'; start: Point }
  | { type: 'drawing'; points: Point[] };

const TOOL_ORDER: AnnotationTool[] = ['select', 'highlight', 'note', 'drawing'];

const COLOR_SWATCHES = ['#facc15', '#fb7185', '#38bdf8', '#4ade80', '#a78bfa'];

const MIN_RECT_EDGE = 0.01;
const DRAW_POINT_THRESHOLD = 0.004;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const clampPage = (value: number, count: number) => {
  const max = count > 0 ? count : 1;
  return Math.min(max, Math.max(1, Math.round(value)));
};

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPoint = (value: unknown): value is Point =>
  !!value &&
  typeof value === 'object' &&
  isNumber((value as Point).x) &&
  isNumber((value as Point).y);

const isRect = (value: unknown): value is Rect =>
  !!value &&
  typeof value === 'object' &&
  isNumber((value as Rect).x) &&
  isNumber((value as Rect).y) &&
  isNumber((value as Rect).width) &&
  isNumber((value as Rect).height);

const normalizePoint = (point: Point): Point => ({
  x: clamp(point.x),
  y: clamp(point.y),
});

const normalizeRect = (rect: Rect): Rect => {
  const x1 = clamp(rect.x);
  const y1 = clamp(rect.y);
  const x2 = clamp(rect.x + rect.width);
  const y2 = clamp(rect.y + rect.height);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `annot-${Math.random().toString(36).slice(2, 11)}`;
};

const withAlpha = (color: string, alpha: number) => {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return color;
};

const getBounds = (points: Point[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = clamp(Math.min(...xs));
  const maxX = clamp(Math.max(...xs));
  const minY = clamp(Math.min(...ys));
  const maxY = clamp(Math.max(...ys));
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(maxX - minX, 0.002),
    height: Math.max(maxY - minY, 0.002),
  };
};

const normalizeAnnotation = (
  candidate: unknown,
  pageCount: number,
): Annotation | null => {
  if (!candidate || typeof candidate !== 'object') return null;
  const value = candidate as Partial<Annotation> & {
    rect?: Rect;
    position?: Point;
    points?: Point[];
    comment?: string;
    text?: string;
  };
  if (!value.id || typeof value.id !== 'string') return null;
  if (!value.type) return null;
  const page = clampPage(
    typeof value.page === 'number' ? value.page : 1,
    pageCount,
  );
  const createdAt = isNumber(value.createdAt) ? value.createdAt : Date.now();
  const updatedAt = isNumber(value.updatedAt) ? value.updatedAt : createdAt;
  const color = typeof value.color === 'string' ? value.color : COLOR_SWATCHES[0];
  if (value.type === 'highlight' && value.rect && isRect(value.rect)) {
    return {
      id: value.id,
      type: 'highlight',
      page,
      rect: normalizeRect(value.rect),
      color,
      createdAt,
      updatedAt,
      comment: typeof value.comment === 'string' ? value.comment : '',
      author: value.author,
    };
  }
  if (value.type === 'note' && value.position && isPoint(value.position)) {
    return {
      id: value.id,
      type: 'note',
      page,
      position: normalizePoint(value.position),
      color,
      createdAt,
      updatedAt,
      text: typeof value.text === 'string' ? value.text : '',
      author: value.author,
    };
  }
  if (
    value.type === 'drawing' &&
    Array.isArray(value.points) &&
    value.points.every(isPoint)
  ) {
    const normalizedPoints = value.points.map(normalizePoint);
    if (normalizedPoints.length < 2) return null;
    return {
      id: value.id,
      type: 'drawing',
      page,
      points: normalizedPoints,
      color,
      createdAt,
      updatedAt,
      comment: typeof value.comment === 'string' ? value.comment : '',
      author: value.author,
    };
  }
  return null;
};

const sanitizeAnnotations = (
  items: Annotation[],
  pageCount: number,
): Annotation[] =>
  items
    .map((item) => normalizeAnnotation(item, pageCount))
    .filter((item): item is Annotation => !!item);

const toolCursor: Record<AnnotationTool, string> = {
  select: 'default',
  highlight: 'crosshair',
  note: 'copy',
  drawing: 'crosshair',
};

const TOOL_LABELS: Record<AnnotationTool, string> = {
  select: 'Select',
  highlight: 'Highlight',
  note: 'Note',
  drawing: 'Draw',
};

const TYPE_LABELS: Record<AnnotationType, string> = {
  highlight: 'Highlight',
  note: 'Note',
  drawing: 'Drawing',
};

const formatTimestamp = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return '';
  }
};

const Annot: React.FC<AnnotProps> = ({
  documentId,
  page,
  pageCount,
  containerRef,
  initialAnnotations,
  onJumpToPage,
  onAnnotationsChange,
}) => {
  const [currentContainer, setCurrentContainer] = useState<HTMLElement | null>(
    null,
  );
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState(COLOR_SWATCHES[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AnnotationType>('all');
  const [currentOnly, setCurrentOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftRect, setDraftRect] = useState<Rect | null>(null);
  const [draftDrawing, setDraftDrawing] = useState<Point[] | null>(null);
  const pointerState = useRef<PointerState | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const pendingBroadcastRef = useRef<Annotation[] | null>(null);
  const sessionIdRef = useRef(generateId());
  const [collabOnline, setCollabOnline] = useState(false);
  const [status, setStatus] = useState<
    | {
        tone: 'success' | 'error' | 'info';
        message: string;
      }
    | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const noteEditorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [annotationsState, setAnnotationsState] = usePersistentState<
    Annotation[]
  >(
    `pdf-annotations:${documentId}`,
    [],
    (value): value is Annotation[] =>
      Array.isArray(value) &&
      value.every((item) => !!normalizeAnnotation(item, pageCount)),
  );

  const sanitize = useCallback(
    (items: Annotation[]): Annotation[] => sanitizeAnnotations(items, pageCount),
    [pageCount],
  );

  const setAnnotations = useCallback(
    (
      updater: Annotation[] | ((prev: Annotation[]) => Annotation[]),
      origin: 'local' | 'remote' = 'local',
    ) => {
      setAnnotationsState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: Annotation[]) => Annotation[])(prev)
            : updater;
        const sanitized = sanitize(next);
        pendingBroadcastRef.current = origin === 'local' ? sanitized : null;
        return sanitized;
      });
    },
    [sanitize, setAnnotationsState],
  );

  const annotations = annotationsState;

  useEffect(() => {
    if (!initialAnnotations?.length) return;
    if (annotations.length > 0) return;
    setAnnotations(() => sanitize(initialAnnotations), 'remote');
  }, [annotations.length, initialAnnotations, sanitize, setAnnotations]);

  useEffect(() => {
    if (!status) return;
    if (typeof window === 'undefined') return;
    const timeout = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = containerRef.current;
    if (el && el !== currentContainer) {
      setCurrentContainer(el);
    }
  }, [containerRef, currentContainer, page]);

  useEffect(() => {
    const container = currentContainer;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setOverlaySize({ width: rect.width, height: rect.height });
    };

    updateSize();

    let observer: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(updateSize);
      observer.observe(container);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateSize);
      }
    };
  }, [currentContainer, page]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof BroadcastChannel === 'undefined') {
      setCollabOnline(false);
      return;
    }
    const channel = new BroadcastChannel(`pdf-annotations:${documentId}`);
    channelRef.current = channel;
    setCollabOnline(true);

    const handler = (event: MessageEvent<CollaborationEvent>) => {
      const data = event.data;
      if (!data || data.type !== 'sync') return;
      if (data.sessionId === sessionIdRef.current) return;
      if (!Array.isArray(data.annotations)) return;
      setAnnotations(() => sanitize(data.annotations), 'remote');
    };

    channel.addEventListener('message', handler as EventListener);
    return () => {
      setCollabOnline(false);
      channel.removeEventListener('message', handler as EventListener);
      channel.close();
      channelRef.current = null;
    };
  }, [documentId, sanitize, setAnnotations]);

  useEffect(() => {
    if (pendingBroadcastRef.current && channelRef.current) {
      channelRef.current.postMessage({
        type: 'sync',
        annotations: pendingBroadcastRef.current,
        sessionId: sessionIdRef.current,
      });
      pendingBroadcastRef.current = null;
    }
  }, [annotations]);

  useEffect(() => {
    onAnnotationsChange?.(annotations);
  }, [annotations, onAnnotationsChange]);

  useEffect(() => {
    if (!selectedId) return;
    if (!annotations.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
    if (
      editingNoteId &&
      !annotations.some((item) => item.id === editingNoteId)
    ) {
      setEditingNoteId(null);
    }
  }, [annotations, editingNoteId, selectedId]);

  useEffect(() => {
    if (!editingNoteId) return;
    const target = noteEditorRefs.current[editingNoteId];
    if (target) {
      target.focus();
      const length = target.value.length;
      try {
        target.setSelectionRange(length, length);
      } catch {
        // ignore selection issues on non-text inputs
      }
    }
  }, [editingNoteId]);

  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  const currentPageAnnotations = useMemo(
    () => annotations.filter((item) => item.page === page),
    [annotations, page],
  );

  const filteredAnnotations = useMemo(() => {
    const search = deferredSearch;
    return annotations
      .filter((item) => (typeFilter === 'all' ? true : item.type === typeFilter))
      .filter((item) => (currentOnly ? item.page === page : true))
      .filter((item) => {
        if (!search) return true;
        const haystack = [
          TYPE_LABELS[item.type],
          `page ${item.page}`,
          'comment' in item ? (item as HighlightAnnotation | DrawingAnnotation).comment : '',
          item.type === 'note' ? (item as NoteAnnotation).text : '',
          item.author ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [annotations, currentOnly, deferredSearch, page, typeFilter]);

  const handlePointerPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const overlay = overlayRef.current;
      if (!overlay) return null;
      const rect = overlay.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: clamp((clientX - rect.left) / rect.width),
        y: clamp((clientY - rect.top) / rect.height),
      };
    },
    [],
  );

  const resetPointerState = useCallback(() => {
    pointerState.current = null;
    setDraftRect(null);
    setDraftDrawing(null);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (tool === 'select') return;
      if (!overlaySize.width || !overlaySize.height) return;
      const point = handlePointerPoint(event.clientX, event.clientY);
      if (!point) return;
      if (tool === 'note') {
        event.preventDefault();
        const newAnnotation: NoteAnnotation = {
          id: generateId(),
          type: 'note',
          page: clampPage(page, pageCount),
          position: point,
          color: activeColor,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          text: '',
        };
        setAnnotations((prev) => [...prev, newAnnotation]);
        setSelectedId(newAnnotation.id);
        setEditingNoteId(newAnnotation.id);
        return;
      }
      event.preventDefault();
      if (tool === 'highlight') {
        pointerState.current = { type: 'highlight', start: point };
        setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 });
        if (event.currentTarget.setPointerCapture) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      } else if (tool === 'drawing') {
        pointerState.current = { type: 'drawing', points: [point] };
        setDraftDrawing([point]);
        if (event.currentTarget.setPointerCapture) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }
    },
    [
      activeColor,
      handlePointerPoint,
      overlaySize.height,
      overlaySize.width,
      page,
      pageCount,
      setAnnotations,
      tool,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = pointerState.current;
      if (!state) return;
      const point = handlePointerPoint(event.clientX, event.clientY);
      if (!point) return;
      event.preventDefault();
      if (state.type === 'highlight') {
        const rect = normalizeRect({
          x: state.start.x,
          y: state.start.y,
          width: point.x - state.start.x,
          height: point.y - state.start.y,
        });
        setDraftRect(rect);
      } else if (state.type === 'drawing') {
        const last = state.points[state.points.length - 1];
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        if (Math.hypot(dx, dy) >= DRAW_POINT_THRESHOLD) {
          const nextPoints = [...state.points, point];
          pointerState.current = { type: 'drawing', points: nextPoints };
          setDraftDrawing(nextPoints);
        }
      }
    },
    [handlePointerPoint],
  );

  const commitHighlight = useCallback(() => {
    const state = pointerState.current;
    if (!state || state.type !== 'highlight' || !draftRect) return;
    if (
      draftRect.width < MIN_RECT_EDGE &&
      draftRect.height < MIN_RECT_EDGE
    ) {
      return;
    }
    const newAnnotation: HighlightAnnotation = {
      id: generateId(),
      type: 'highlight',
      page: clampPage(page, pageCount),
      rect: draftRect,
      color: activeColor,
      comment: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedId(newAnnotation.id);
  }, [activeColor, draftRect, page, pageCount, setAnnotations]);

  const commitDrawing = useCallback(() => {
    const state = pointerState.current;
    if (!state || state.type !== 'drawing') return;
    const points = draftDrawing ?? state.points;
    if (!points || points.length < 2) return;
    const newAnnotation: DrawingAnnotation = {
      id: generateId(),
      type: 'drawing',
      page: clampPage(page, pageCount),
      points,
      color: activeColor,
      comment: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedId(newAnnotation.id);
  }, [activeColor, draftDrawing, page, pageCount, setAnnotations]);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = pointerState.current;
      if (!state) return;
      if (state.type === 'highlight') {
        commitHighlight();
      } else if (state.type === 'drawing') {
        commitDrawing();
      }
      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // ignore release errors
        }
      }
      resetPointerState();
    },
    [commitDrawing, commitHighlight, resetPointerState],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
      }
      resetPointerState();
    },
    [resetPointerState],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetPointerState();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetPointerState]);

  const handleSelectAnnotation = useCallback(
    (annotation: Annotation) => {
      setSelectedId(annotation.id);
      if (annotation.type === 'note') {
        setEditingNoteId(annotation.id);
      } else {
        setEditingNoteId(null);
      }
      onJumpToPage?.(annotation.page);
    },
    [onJumpToPage],
  );

  const handleDeleteAnnotation = useCallback(
    (annotation: Annotation) => {
      setAnnotations((prev) => prev.filter((item) => item.id !== annotation.id));
      setStatus({ tone: 'info', message: 'Annotation removed.' });
    },
    [setAnnotations],
  );

  const handleNoteChange = useCallback(
    (id: string, text: string) => {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === id && item.type === 'note'
            ? {
                ...item,
                text,
                updatedAt: Date.now(),
              }
            : item,
        ),
      );
    },
    [setAnnotations],
  );

  const handleCommentChange = useCallback(
    (id: string, comment: string) => {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === id && item.type !== 'note'
            ? {
                ...item,
                comment,
                updatedAt: Date.now(),
              }
            : item,
        ),
      );
    },
    [setAnnotations],
  );

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid format');
        }
        const normalized = sanitizeAnnotations(parsed, pageCount);
        if (!normalized.length) {
          throw new Error('No valid annotations found');
        }
        setAnnotations(() => normalized, 'remote');
        setStatus({ tone: 'success', message: 'Annotations imported.' });
      } catch (error) {
        setStatus({
          tone: 'error',
          message:
            error instanceof Error
              ? `Import failed: ${error.message}`
              : 'Import failed.',
        });
      }
    },
    [pageCount, setAnnotations],
  );

  const handleExport = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!annotations.length) {
      setStatus({ tone: 'info', message: 'Nothing to export yet.' });
      return;
    }
    const payload = JSON.stringify(annotations, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${documentId || 'annotations'}.json`;
    anchor.rel = 'noopener noreferrer';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({ tone: 'success', message: 'Export ready.' });
  }, [annotations, documentId]);

  const handleClearAll = useCallback(() => {
    setAnnotations(() => [], 'remote');
    setStatus({ tone: 'info', message: 'All annotations cleared.' });
  }, [setAnnotations]);

  const overlayPortal =
    typeof document !== 'undefined' && currentContainer
      ? createPortal(
          <div
            ref={overlayRef}
            className="absolute inset-0"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="absolute inset-0"
              style={{
                pointerEvents: tool === 'select' ? 'none' : 'auto',
                cursor: toolCursor[tool],
                touchAction: tool === 'drawing' ? 'none' : 'auto',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerCancel}
              onPointerCancel={handlePointerCancel}
            />
            <div className="absolute inset-0 pointer-events-none">
              {draftRect && tool === 'highlight' && (
                <div
                  className="absolute border border-dashed border-sky-400"
                  style={{
                    left: `${draftRect.x * 100}%`,
                    top: `${draftRect.y * 100}%`,
                    width: `${draftRect.width * 100}%`,
                    height: `${draftRect.height * 100}%`,
                    backgroundColor: withAlpha(activeColor, 0.2),
                  }}
                />
              )}
              {draftDrawing && tool === 'drawing' && overlaySize.width > 0 && (
                <svg
                  className="absolute inset-0"
                  width={overlaySize.width}
                  height={overlaySize.height}
                  viewBox={`0 0 ${overlaySize.width} ${overlaySize.height}`}
                >
                  <path
                    d={draftDrawing
                      .map((point, index) =>
                        `${index === 0 ? 'M' : 'L'} ${point.x * overlaySize.width} ${
                          point.y * overlaySize.height
                        }`,
                      )
                      .join(' ')}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {overlaySize.width > 0 && (
                <svg
                  className="absolute inset-0"
                  width={overlaySize.width}
                  height={overlaySize.height}
                  viewBox={`0 0 ${overlaySize.width} ${overlaySize.height}`}
                >
                  {currentPageAnnotations
                    .filter((item): item is DrawingAnnotation => item.type === 'drawing')
                    .map((annotation) => (
                      <path
                        key={annotation.id}
                        d={annotation.points
                          .map((point, index) =>
                            `${index === 0 ? 'M' : 'L'} ${
                              point.x * overlaySize.width
                            } ${point.y * overlaySize.height}`,
                          )
                          .join(' ')}
                        fill="none"
                        stroke={annotation.color}
                        strokeWidth={selectedId === annotation.id ? 3 : 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.95}
                      />
                    ))}
                </svg>
              )}
              {currentPageAnnotations.map((annotation) => {
                if (annotation.type === 'highlight') {
                  return (
                    <button
                      key={annotation.id}
                      type="button"
                      className={`absolute rounded-sm transition shadow-sm ${
                        selectedId === annotation.id
                          ? 'ring-2 ring-offset-2 ring-sky-400 ring-offset-slate-900'
                          : ''
                      }`}
                      style={{
                        left: `${annotation.rect.x * 100}%`,
                        top: `${annotation.rect.y * 100}%`,
                        width: `${annotation.rect.width * 100}%`,
                        height: `${annotation.rect.height * 100}%`,
                        backgroundColor: withAlpha(annotation.color, 0.35),
                        pointerEvents: 'auto',
                      }}
                      onClick={() => handleSelectAnnotation(annotation)}
                      aria-label={`Highlight on page ${annotation.page}`}
                    />
                  );
                }
                if (annotation.type === 'note') {
                  return (
                    <button
                      key={annotation.id}
                      type="button"
                      className={`absolute -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-xs font-medium shadow ${
                        selectedId === annotation.id
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-900/90 text-slate-100'
                      }`}
                      style={{
                        left: `${annotation.position.x * 100}%`,
                        top: `${annotation.position.y * 100}%`,
                        pointerEvents: 'auto',
                      }}
                      onClick={() => handleSelectAnnotation(annotation)}
                      aria-label={`Note on page ${annotation.page}`}
                    >
                      {annotation.text ? annotation.text.slice(0, 24) : 'Note'}
                    </button>
                  );
                }
                if (annotation.type === 'drawing') {
                  const bounds = getBounds(annotation.points);
                  return (
                    <button
                      key={annotation.id}
                      type="button"
                      className="absolute"
                      style={{
                        left: `${bounds.minX * 100}%`,
                        top: `${bounds.minY * 100}%`,
                        width: `${bounds.width * 100}%`,
                        height: `${bounds.height * 100}%`,
                        pointerEvents: 'auto',
                        background: 'transparent',
                        border:
                          selectedId === annotation.id
                            ? '1px solid rgba(56, 189, 248, 0.75)'
                            : '1px solid transparent',
                      }}
                      onClick={() => handleSelectAnnotation(annotation)}
                      aria-label={`Drawing on page ${annotation.page}`}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>,
          currentContainer,
        )
      : null;

  const totalCount = annotations.length;
  const currentCount = currentPageAnnotations.length;

  return (
    <>
      {overlayPortal}
      <aside className="w-full rounded-lg border border-slate-700/60 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-inner backdrop-blur lg:w-80 xl:w-96">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Annotations</h2>
            <p className="text-xs text-slate-400">
              {currentOnly ? currentCount : filteredAnnotations.length} shown · {totalCount}{' '}
              total
              {collabOnline ? ' · Live collaboration' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Annotation tools">
            {TOOL_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                  tool === option
                    ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                    : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500'
                }`}
                onClick={() => setTool(option)}
                aria-pressed={tool === option}
              >
                {TOOL_LABELS[option]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Annotation color">
            <span className="text-xs text-slate-300">Color</span>
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`h-6 w-6 rounded-full border transition ${
                  activeColor === swatch
                    ? 'border-sky-300 ring-2 ring-offset-1 ring-offset-slate-900'
                    : 'border-slate-600'
                }`}
                style={{ backgroundColor: swatch }}
                onClick={() => setActiveColor(swatch)}
                aria-label={`Use ${swatch} ink`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="search"
                className="w-full rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                placeholder="Filter annotations"
                value={searchTerm}
                aria-label="Filter annotations"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div
                role="group"
                aria-label="Filter by type"
                className="flex gap-1"
              >
                {[
                  { value: 'all' as const, label: 'All' },
                  { value: 'highlight' as const, label: 'Highlights' },
                  { value: 'note' as const, label: 'Notes' },
                  { value: 'drawing' as const, label: 'Drawings' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`rounded-md border px-2 py-1 text-[11px] transition ${
                      typeFilter === filter.value
                        ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500'
                    }`}
                    aria-pressed={typeFilter === filter.value}
                    onClick={() => setTypeFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={currentOnly}
                aria-label="Limit to current page"
                onChange={(event) => setCurrentOnly(event.target.checked)}
              />
              Current page only
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs transition hover:border-slate-500"
              onClick={() => fileInputRef.current?.click()}
            >
              Import
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs transition hover:border-slate-500"
              onClick={handleExport}
            >
              Export
            </button>
            <button
              type="button"
              className="rounded-md border border-rose-500/60 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition hover:border-rose-400"
              onClick={handleClearAll}
            >
              Clear
            </button>
          </div>
          {status && (
            <div
              className={`rounded-md px-3 py-2 text-xs ${
                status.tone === 'success'
                  ? 'bg-emerald-500/10 text-emerald-200'
                  : status.tone === 'error'
                  ? 'bg-rose-500/10 text-rose-200'
                  : 'bg-slate-800/70 text-slate-200'
              }`}
              role="status"
            >
              {status.message}
            </div>
          )}
        </div>
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {filteredAnnotations.length === 0 ? (
            <p className="text-xs text-slate-400">
              {annotations.length === 0
                ? 'No annotations yet. Pick a tool to get started.'
                : 'Nothing matches your filters yet.'}
            </p>
          ) : (
            filteredAnnotations.map((annotation) => {
              const isSelected = selectedId === annotation.id;
              const baseClass = `rounded-md border px-3 py-2 text-xs transition ${
                isSelected
                  ? 'border-sky-500/70 bg-sky-500/10'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
              }`;
              return (
                <div key={annotation.id} className={baseClass}>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left font-medium text-slate-100"
                      onClick={() => handleSelectAnnotation(annotation)}
                    >
                      {TYPE_LABELS[annotation.type]} · Page {annotation.page}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-100"
                        onClick={() => onJumpToPage?.(annotation.page)}
                        aria-label="Jump to page"
                      >
                        ↗
                      </button>
                      <button
                        type="button"
                        className="text-rose-400 hover:text-rose-200"
                        onClick={() => handleDeleteAnnotation(annotation)}
                        aria-label="Delete annotation"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {annotation.author && (
                      <span className="mr-2 font-semibold text-slate-200">
                        {annotation.author}
                      </span>
                    )}
                    {formatTimestamp(annotation.updatedAt)}
                  </p>
                  {annotation.type === 'note' ? (
                    <textarea
                      className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                      placeholder="Add note details"
                      value={annotation.text}
                      aria-label="Note details"
                      ref={(element) => {
                        if (element) {
                          noteEditorRefs.current[annotation.id] = element;
                        } else {
                          delete noteEditorRefs.current[annotation.id];
                        }
                      }}
                      onChange={(event) =>
                        handleNoteChange(annotation.id, event.target.value)
                      }
                      rows={3}
                    />
                  ) : (
                    <textarea
                      className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                      placeholder="Add a comment"
                      value={annotation.comment}
                      aria-label="Annotation comment"
                      onChange={(event) =>
                        handleCommentChange(annotation.id, event.target.value)
                      }
                      rows={2}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          className="hidden"
          aria-hidden="true"
          onChange={handleImport}
        />
      </aside>
    </>
  );
};

export default Annot;
