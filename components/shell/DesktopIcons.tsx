import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useSettings } from '../../hooks/useSettings';
import {
  GRID_CONFIG,
  GridConfig,
  IconPosition,
  calculateGridMetrics,
  resolveGridConflicts,
  snapPixelToGrid,
  positionsAreEqual,
} from './iconGrid';

interface DesktopIconDescriptor {
  id: string;
  name: string;
  displayName?: string;
  icon: string;
  disabled?: boolean;
  prefetch?: () => void;
}

interface DesktopIconsProps {
  icons: DesktopIconDescriptor[];
  positions?: Record<string, IconPosition>;
  onActivate: (id: string) => void;
  onPositionsChange?: (positions: Record<string, IconPosition>) => void;
}

export interface DesktopIconsHandle {
  alignToGrid: () => void;
}

interface DragState {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
}

const areMapsEqual = positionsAreEqual;

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const DesktopIcons = forwardRef<DesktopIconsHandle, DesktopIconsProps>(
  ({ icons, positions: externalPositions, onActivate, onPositionsChange }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const liveRegionRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const { density } = useSettings();
    const prefersReducedMotion = usePrefersReducedMotion();

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [internalPositions, setInternalPositions] = useState<Record<string, IconPosition>>({});
    const [, forceRender] = useState(0);

    const gridConfig: GridConfig = useMemo(() => GRID_CONFIG[density] ?? GRID_CONFIG.regular, [density]);

    const metrics = useMemo(
      () => calculateGridMetrics(containerSize.width, containerSize.height, icons.length, gridConfig),
      [containerSize.height, containerSize.width, gridConfig, icons.length],
    );

    const iconOrder = useMemo(() => icons.map((icon) => icon.id), [icons]);

    const announce = useCallback((message: string) => {
      if (!liveRegionRef.current) return;
      liveRegionRef.current.textContent = message;
    }, []);

    const applyPositions = useCallback(
      (updater: (prev: Record<string, IconPosition>) => Record<string, IconPosition>) => {
        setInternalPositions((prev) => {
          const draft = updater(prev);
          const resolved = resolveGridConflicts(draft, iconOrder, metrics);
          if (areMapsEqual(prev, resolved)) {
            return prev;
          }
          onPositionsChange?.(resolved);
          return resolved;
        });
      },
      [iconOrder, metrics, onPositionsChange],
    );

    const alignToGrid = useCallback(() => {
      applyPositions(() => ({}));
      if (icons.length > 0) {
        announce('Desktop icons aligned to grid.');
      }
    }, [announce, applyPositions, icons.length]);

    useImperativeHandle(ref, () => ({ alignToGrid }), [alignToGrid]);

    useEffect(() => {
      if (!containerRef.current) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!externalPositions) return;
      setInternalPositions((prev) => {
        const resolved = resolveGridConflicts(externalPositions, iconOrder, metrics);
        if (areMapsEqual(prev, resolved)) return prev;
        return resolved;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalPositions, iconOrder, metrics.columns, metrics.rows]);

    useEffect(() => {
      setInternalPositions((prev) => resolveGridConflicts(prev, iconOrder, metrics));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iconOrder.join(':'), metrics.columns, metrics.rows]);

    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLDivElement>, iconId: string) => {
        if (event.button !== 0) return;
        const container = containerRef.current;
        if (!container) return;
        const iconPosition = internalPositions[iconId];
        const base = iconPosition
          ? {
              x: gridConfig.padding + iconPosition.column * metrics.columnWidth,
              y: gridConfig.padding + iconPosition.row * metrics.rowHeight,
            }
          : { x: gridConfig.padding, y: gridConfig.padding };
        const iconRect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        dragStateRef.current = {
          id: iconId,
          pointerId: event.pointerId,
          offsetX: event.clientX - iconRect.left,
          offsetY: event.clientY - iconRect.top,
          x: base.x,
          y: base.y,
        };
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
        const constrainedX = clamp(base.x, gridConfig.padding, Math.max(gridConfig.padding, containerRect.width - gridConfig.iconWidth - gridConfig.padding));
        const constrainedY = clamp(base.y, gridConfig.padding, Math.max(gridConfig.padding, containerRect.height - gridConfig.iconHeight - gridConfig.padding));
        dragStateRef.current.x = constrainedX;
        dragStateRef.current.y = constrainedY;
        forceRender((count) => count + 1);
      },
      [forceRender, gridConfig, internalPositions, metrics.columnWidth, metrics.rowHeight],
    );

    const handlePointerMove = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        const container = containerRef.current;
        if (!dragState || !container) return;
        if (event.pointerId !== dragState.pointerId) return;
        const containerRect = container.getBoundingClientRect();
        const rawX = event.clientX - containerRect.left - dragState.offsetX;
        const rawY = event.clientY - containerRect.top - dragState.offsetY;
        const minX = gridConfig.padding;
        const minY = gridConfig.padding;
        const maxX = Math.max(minX, containerRect.width - gridConfig.iconWidth - gridConfig.padding);
        const maxY = Math.max(minY, containerRect.height - gridConfig.iconHeight - gridConfig.padding);
        dragState.x = clamp(rawX, minX, maxX);
        dragState.y = clamp(rawY, minY, maxY);
        event.preventDefault();
        forceRender((count) => count + 1);
      },
      [forceRender, gridConfig],
    );

    const handlePointerUp = useCallback(
      (event: PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        const container = containerRef.current;
        if (!dragState || !container) return;
        if (event.pointerId !== dragState.pointerId) return;
        const iconId = dragState.id;
        const snapped = snapPixelToGrid(dragState.x, dragState.y, metrics, gridConfig);
        applyPositions((prev) => ({ ...prev, [iconId]: snapped }));
        announce(`Moved ${icons.find((icon) => icon.id === iconId)?.name ?? 'icon'} to column ${snapped.column + 1}, row ${snapped.row + 1}.`);
        dragStateRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        forceRender((count) => count + 1);
      },
      [announce, applyPositions, forceRender, gridConfig, icons, metrics],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLButtonElement>, iconId: string, iconName: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate(iconId);
          return;
        }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          return;
        }
        if (!event.ctrlKey && !event.metaKey) {
          return;
        }
        event.preventDefault();
        const delta: IconPosition = { column: 0, row: 0 };
        if (event.key === 'ArrowUp') delta.row = -1;
        if (event.key === 'ArrowDown') delta.row = 1;
        if (event.key === 'ArrowLeft') delta.column = -1;
        if (event.key === 'ArrowRight') delta.column = 1;
        const current = internalPositions[iconId] ?? { column: 0, row: 0 };
        const nextColumn = clamp(current.column + delta.column, 0, Math.max(0, metrics.columns - 1));
        const nextRow = clamp(current.row + delta.row, 0, Math.max(0, metrics.rows - 1));
        applyPositions((prev) => ({
          ...prev,
          [iconId]: { column: nextColumn, row: nextRow },
        }));
        announce(`Moved ${iconName} to column ${nextColumn + 1}, row ${nextRow + 1}.`);
      },
      [announce, applyPositions, internalPositions, metrics.columns, metrics.rows, onActivate],
    );

    const styleForIcon = useCallback(
      (iconId: string): CSSProperties => {
        const dragState = dragStateRef.current;
        if (dragState && dragState.id === iconId) {
          return {
            transform: `translate3d(${dragState.x}px, ${dragState.y}px, 0)`,
            transition: prefersReducedMotion ? 'none' : 'transform 120ms ease',
          };
        }
        const position = internalPositions[iconId];
        const x = position
          ? gridConfig.padding + position.column * metrics.columnWidth
          : gridConfig.padding;
        const y = position
          ? gridConfig.padding + position.row * metrics.rowHeight
          : gridConfig.padding;
        return {
          transform: `translate3d(${x}px, ${y}px, 0)`,
          transition: prefersReducedMotion ? 'none' : 'transform 160ms ease',
        };
      },
      [gridConfig.padding, internalPositions, metrics.columnWidth, metrics.rowHeight, prefersReducedMotion],
    );

    const handlePrefetch = useCallback((prefetch?: () => void) => {
      if (typeof prefetch === 'function') prefetch();
    }, []);

    return (
      <div
        ref={containerRef}
        role="grid"
        aria-label="Desktop icons"
        className="absolute inset-0"
        style={{ position: 'absolute' }}
      >
        {icons.map((icon) => (
          <div
            key={icon.id}
            role="gridcell"
            aria-label={icon.name}
            aria-disabled={icon.disabled}
            className="absolute"
            style={{
              width: gridConfig.iconWidth,
              height: gridConfig.iconHeight,
              ...styleForIcon(icon.id),
            }}
            onPointerDown={(event) => handlePointerDown(event, icon.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <button
              type="button"
              data-context="app"
              data-app-id={icon.id}
              aria-keyshortcuts="Ctrl+ArrowUp Ctrl+ArrowDown Ctrl+ArrowLeft Ctrl+ArrowRight"
              className={`w-full h-full focus:outline-none rounded border border-transparent p-2 flex flex-col items-center justify-center text-white text-xs select-none transition hover:bg-white/10 focus:bg-white/20 focus:border-yellow-700 focus:border-opacity-100 ${
                icon.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-default'
              }`}
              disabled={icon.disabled}
              onDoubleClick={() => onActivate(icon.id)}
              onKeyDown={(event) => handleKeyDown(event, icon.id, icon.name)}
              onFocus={() => handlePrefetch(icon.prefetch)}
              onMouseEnter={() => handlePrefetch(icon.prefetch)}
            >
              <Image
                width={40}
                height={40}
                src={icon.icon.replace('./', '/')}
                alt={icon.name}
                className="mb-1 w-10 h-10"
                draggable={false}
              />
              <span className="text-center" aria-hidden="true">
                {icon.displayName ?? icon.name}
              </span>
            </button>
          </div>
        ))}
        <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRegionRef} />
      </div>
    );
  },
);

DesktopIcons.displayName = 'DesktopIcons';

export default DesktopIcons;
