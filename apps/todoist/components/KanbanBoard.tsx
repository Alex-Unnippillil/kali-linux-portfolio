import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface KanbanColumn {
  id: string;
  title: string;
  element: React.ReactNode;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
}

const STORAGE_KEY = 'todoist-column-order';

export default function KanbanBoard({ columns }: KanbanBoardProps) {
  const [order, setOrder] = usePersistentState<string[]>(
    STORAGE_KEY,
    () => columns.map((c) => c.id),
  );
  const [dragState, setDragState] = useState<{
    id: string;
    pointerId: number;
    initialX: number;
    deltaX: number;
    layout: { id: string; center: number }[];
  } | null>(null);
  const [tempOrder, setTempOrder] = useState<string[] | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const orderRef = useRef(order);
  const tempOrderRef = useRef<string[] | null>(tempOrder);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    tempOrderRef.current = tempOrder;
  }, [tempOrder]);

  const displayOrder = tempOrder ?? order;

  const columnMap = useMemo(() => {
    const map: Record<string, KanbanColumn> = {};
    columns.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [columns]);

  const orderedColumns = displayOrder
    .map((id) => columnMap[id])
    .filter((c): c is KanbanColumn => Boolean(c));

  const commitOrder = useCallback(
    (next: string[] | null) => {
      const finalOrder = next ?? orderRef.current;
      const current = orderRef.current;
      if (finalOrder.length !== current.length) {
        setOrder(finalOrder);
        return;
      }
      for (let i = 0; i < finalOrder.length; i += 1) {
        if (finalOrder[i] !== current[i]) {
          setOrder(finalOrder);
          return;
        }
      }
    },
    [setOrder],
  );

  const measureLayout = useCallback(() => {
    const layout: { id: string; center: number }[] = [];
    displayOrder.forEach((id) => {
      const el = columnRefs.current[id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      layout.push({ id, center: rect.left + rect.width / 2 });
    });
    return layout;
  }, [displayOrder]);

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    const layout = measureLayout();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    setDragState({
      id,
      pointerId: e.pointerId,
      initialX: e.clientX,
      deltaX: 0,
      layout,
    });
  };

  const handlePointerMove = (id: string) => (e: React.PointerEvent) => {
    setDragState((prev) => {
      if (!prev || prev.pointerId !== e.pointerId) return prev;
      const layoutEntry = prev.layout.find((entry) => entry.id === id);
      if (!layoutEntry) return prev;
      const deltaX = e.clientX - prev.initialX;
      const currentCenter = layoutEntry.center + deltaX;
      const sorted = prev.layout.slice().sort((a, b) => a.center - b.center);
      const newIndex = sorted.filter(
        (entry) => entry.id !== id && currentCenter > entry.center,
      ).length;
      const currentOrder = tempOrderRef.current ?? orderRef.current;
      const currentIndex = currentOrder.indexOf(id);
      if (currentIndex === -1) {
        return { ...prev, deltaX };
      }
      if (newIndex !== currentIndex) {
        const updated = [...currentOrder];
        updated.splice(currentIndex, 1);
        updated.splice(newIndex, 0, id);
        tempOrderRef.current = updated;
        setTempOrder(updated);
      } else if (tempOrderRef.current === null) {
        const clone = [...currentOrder];
        tempOrderRef.current = clone;
        setTempOrder(clone);
      }
      return { ...prev, deltaX };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState && e.pointerId === dragState.pointerId) {
      const handle = e.currentTarget as HTMLElement;
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
      commitOrder(tempOrderRef.current);
      setDragState(null);
      setTempOrder(null);
      tempOrderRef.current = null;
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (dragState && e.pointerId === dragState.pointerId) {
      const handle = e.currentTarget as HTMLElement;
      if (handle.hasPointerCapture(e.pointerId)) {
        handle.releasePointerCapture(e.pointerId);
      }
      setDragState(null);
      setTempOrder(null);
      tempOrderRef.current = null;
    }
  };

  const handleKeyDown = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentOrder = tempOrderRef.current ?? orderRef.current;
      const current = currentOrder.indexOf(id);
      const target = current + (e.key === 'ArrowLeft' ? -1 : 1);
      if (target < 0 || target >= currentOrder.length) return;
      const newOrder = [...currentOrder];
      newOrder.splice(current, 1);
      newOrder.splice(target, 0, id);
      tempOrderRef.current = null;
      setTempOrder(null);
      setOrder(newOrder);
    }
  };

  const useIsomorphicLayoutEffect =
    typeof window === 'undefined' ? useEffect : useLayoutEffect;

  useIsomorphicLayoutEffect(() => {
    const newPositions = new Map<string, DOMRect>();
    orderedColumns.forEach((col) => {
      const el = columnRefs.current[col.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      newPositions.set(col.id, rect);
      const previous = positionsRef.current.get(col.id);
      if (
        previous &&
        (previous.left !== rect.left || previous.top !== rect.top) &&
        (!dragState || dragState.id !== col.id)
      ) {
        const deltaX = previous.left - rect.left;
        const deltaY = previous.top - rect.top;
        if (deltaX !== 0 || deltaY !== 0) {
          el.style.transition = 'none';
          el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          requestAnimationFrame(() => {
            el.style.transition = 'transform 150ms ease';
            el.style.transform = '';
          });
        }
      }
    });
    positionsRef.current = newPositions;
  }, [orderedColumns, dragState]);

  return (
    <div
      className="flex gap-4 overflow-x-auto"
      role="list"
      aria-label="Kanban Board"
    >
      {orderedColumns.map((col) => {
        const isDragging = dragState?.id === col.id;
        return (
          <div
            key={col.id}
            role="listitem"
            aria-label={col.title}
            ref={(node) => {
              columnRefs.current[col.id] = node;
            }}
            className="flex-1 min-w-[16rem]"
            style={{
              transform: isDragging ? `translateX(${dragState?.deltaX ?? 0}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 150ms ease',
            }}
          >
            <button
              type="button"
              aria-label={`Reorder column ${col.title}`}
              aria-grabbed={isDragging}
              onPointerDown={handlePointerDown(col.id)}
              onPointerMove={handlePointerMove(col.id)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyDown={handleKeyDown(col.id)}
              className={`mb-2 inline-flex cursor-grab items-center rounded bg-slate-800/40 px-2 py-1 text-xs font-medium text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-slate-900 touch-none ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ≡
              </span>
              <span className="sr-only">Drag {col.title}</span>
            </button>
            {col.element}
          </div>
        );
      })}
    </div>
  );
}
