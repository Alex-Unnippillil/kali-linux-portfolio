import React, { useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import VirtualList from 'rc-virtual-list';
import usePersistentState from '../../../hooks/usePersistentState';

const STORAGE_KEY = 'todoist-column-order';
const DEFAULT_ITEM_HEIGHT = 72;

export interface KanbanColumn<T = unknown> {
  id: string;
  title: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => React.Key;
  itemHeight?: number;
  emptyState?: React.ReactNode;
  ariaLabel?: string;
}

export interface KanbanBoardProps<T = unknown> {
  columns: KanbanColumn<T>[];
}

type ColumnWithRenderer<T> = KanbanColumn<T> & {
  getItemKey: (item: T, index: number) => React.Key;
  itemHeight: number;
  laneLabel: string;
};

function resolveItemKey<T>(
  columnId: string,
  getItemKey?: KanbanColumn<T>['getItemKey'],
): (item: T, index: number) => React.Key {
  if (getItemKey) return getItemKey;
  return (item: T, index: number) => {
    if (item && typeof item === 'object') {
      const keyCandidate = (item as Record<string, unknown>).id;
      if (typeof keyCandidate === 'string' || typeof keyCandidate === 'number') {
        return keyCandidate;
      }
    }
    return `${columnId}-${index}`;
  };
}

function enrichColumns<T>(columns: KanbanColumn<T>[]): ColumnWithRenderer<T>[] {
  return columns.map((column) => ({
    ...column,
    getItemKey: resolveItemKey<T>(column.id, column.getItemKey),
    itemHeight: column.itemHeight ?? DEFAULT_ITEM_HEIGHT,
    laneLabel: column.ariaLabel ?? `${column.title} lane`,
  }));
}

export default function KanbanBoard<T = unknown>({ columns }: KanbanBoardProps<T>) {
  const [order, setOrder] = usePersistentState<string[]>(
    STORAGE_KEY,
    () => columns.map((c) => c.id),
  );
  const [dragging, setDragging] = useState<string | null>(null);

  const enrichedColumns = useMemo(() => enrichColumns(columns), [columns]);

  const columnMap = useMemo(() => {
    const map: Record<string, ColumnWithRenderer<T>> = {};
    enrichedColumns.forEach((column) => {
      map[column.id] = column;
    });
    return map;
  }, [enrichedColumns]);

  const orderedColumns = useMemo(() => {
    const prioritized = order
      .map((id) => columnMap[id])
      .filter((col): col is ColumnWithRenderer<T> => Boolean(col));
    const missing = enrichedColumns.filter((col) => !prioritized.includes(col));
    return [...prioritized, ...missing];
  }, [columnMap, enrichedColumns, order]);

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
      className="flex h-full min-h-0 gap-4 overflow-x-auto"
      role="list"
      aria-label="Kanban Board"
    >
      {orderedColumns.map((column) => {
        const { items, renderItem, getItemKey, itemHeight, laneLabel, emptyState } = column;
        return (
          <div
            key={column.id}
            role="listitem"
            aria-label={column.title}
            tabIndex={0}
            draggable
            aria-grabbed={dragging === column.id}
            aria-dropeffect="move"
            onDragStart={handleDragStart(column.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop(column.id)}
            onKeyDown={handleKeyDown(column.id)}
            className="flex min-w-[16rem] flex-1 flex-col"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[color:var(--color-text)]">
                {column.title}
              </span>
              <span className="text-xs text-[color:var(--todoist-card-muted)]">
                {items.length} items
              </span>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-[color:var(--todoist-card-border)] bg-[color:var(--todoist-card-surface)] p-2 shadow-sm">
              {items.length === 0 ? (
                emptyState || (
                  <p className="py-8 text-center text-sm text-[color:var(--todoist-card-muted)]">
                    No items
                  </p>
                )
              ) : (
                <div className="h-full min-h-0">
                  <AutoSizer>
                    {({ height, width }) => {
                      const fallbackHeight = Math.max(itemHeight, Math.min(items.length, 6) * itemHeight);
                      const listHeight = height && height > 0 ? height : fallbackHeight;
                      const style = width ? { width } : undefined;
                      return (
                        <VirtualList<T>
                          data={items}
                          height={listHeight}
                          itemHeight={itemHeight}
                          itemKey={(item, index) => getItemKey(item, index)}
                          style={style}
                          innerProps={{ role: 'list', 'aria-label': laneLabel }}
                          fullHeight={false}
                        >
                          {(item, index, { style: itemStyle }) => (
                            <div
                              key={getItemKey(item, index)}
                              style={itemStyle}
                              role="listitem"
                            >
                              {renderItem(item, index)}
                            </div>
                          )}
                        </VirtualList>
                      );
                    }}
                  </AutoSizer>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
