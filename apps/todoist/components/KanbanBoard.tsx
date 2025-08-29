import React, { useState, useMemo } from 'react';
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
  const [dragging, setDragging] = useState<string | null>(null);

  const columnMap = useMemo(() => {
    const map: Record<string, KanbanColumn> = {};
    columns.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [columns]);

  const orderedColumns = order
    .map((id) => columnMap[id])
    .filter((c): c is KanbanColumn => Boolean(c));

  const move = (fromId: string, toId: string) => {
    const fromIndex = order.indexOf(fromId);
    const toIndex = order.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = [...order];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, fromId);
    setOrder(newOrder);
  };

  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    setDragging(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDragging(null);

  const handleDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain') || dragging;
    if (fromId && fromId !== id) {
      move(fromId, id);
    }
    setDragging(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleKeyDown = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const current = order.indexOf(id);
      const target = current + (e.key === 'ArrowLeft' ? -1 : 1);
      if (target < 0 || target >= order.length) return;
      const newOrder = [...order];
      newOrder.splice(current, 1);
      newOrder.splice(target, 0, id);
      setOrder(newOrder);
    }
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto"
      role="list"
      aria-label="Kanban Board"
    >
      {orderedColumns.map((col) => (
        <div
          key={col.id}
          role="listitem"
          aria-label={col.title}
          tabIndex={0}
          draggable
          aria-grabbed={dragging === col.id}
          aria-dropeffect="move"
          onDragStart={handleDragStart(col.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop(col.id)}
          onKeyDown={handleKeyDown(col.id)}
          className="flex-1 min-w-[16rem]"
        >
          {col.element}
        </div>
      ))}
    </div>
  );
}
