'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, DragEvent, KeyboardEvent, SetStateAction } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type FavoriteTool = {
  id: string;
  name: string;
  description: string;
  link?: string;
};

export const FAVORITE_TOOLS: FavoriteTool[] = [
  {
    id: 'repeater',
    name: 'Repeater',
    description: 'Replay and modify captured HTTP requests for safe lab experimentation.',
  },
  {
    id: 'suricata',
    name: 'Suricata Logs',
    description: 'Review bundled IDS events with filters for severity, signature, and host.',
  },
  {
    id: 'zeek',
    name: 'Zeek Logs',
    description: 'Explore network metadata captured by Zeek to pivot between hosts and flows.',
  },
  {
    id: 'sigma',
    name: 'Sigma Explorer',
    description: 'Browse Sigma detection rules and map them to MITRE ATT&CK tactics.',
  },
  {
    id: 'yara',
    name: 'YARA Tester',
    description: 'Run YARA rules against canned samples to understand string and hex matches.',
  },
  {
    id: 'mitre',
    name: 'MITRE ATT&CK',
    description: 'Track simulated adversary techniques and map coverage across the matrix.',
  },
];

const DEFAULT_ORDER = FAVORITE_TOOLS.map((tool) => tool.id);
const FAVORITE_ID_SET = new Set(DEFAULT_ORDER);
const TOOLS_BY_ID = new Map(FAVORITE_TOOLS.map((tool) => [tool.id, tool] as const));
const STORAGE_KEY = 'security-tools:favorites';

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const sanitizeOrder = (raw: string[]) => {
  const seen = new Set<string>();
  const order: string[] = [];
  [...raw, ...DEFAULT_ORDER].forEach((id) => {
    if (FAVORITE_ID_SET.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  });
  return order;
};

const orderValidator = (value: unknown): value is string[] => {
  if (!Array.isArray(value)) return false;
  const sanitized = sanitizeOrder(value.filter((id): id is string => typeof id === 'string'));
  return sanitized.length === DEFAULT_ORDER.length;
};

const useFavoritesOrder = () => {
  const [order, setOrder] = usePersistentState<string[]>(STORAGE_KEY, DEFAULT_ORDER, orderValidator);

  const normalized = useMemo(() => sanitizeOrder(order), [order]);

  useEffect(() => {
    setOrder((prev) => {
      const next = sanitizeOrder(prev);
      return arraysEqual(prev, next) ? prev : next;
    });
  }, [setOrder]);

  return [normalized, setOrder] as const;
};

const useDragReorder = (setOrder: Dispatch<SetStateAction<string[]>>) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const moveRelative = useCallback(
    (sourceId: string, offset: number) => {
      setOrder((prev) => {
        const order = sanitizeOrder(prev);
        const fromIndex = order.indexOf(sourceId);
        const targetIndex = fromIndex + offset;
        if (fromIndex === -1 || targetIndex < 0 || targetIndex >= order.length) {
          return order;
        }
        const updated = [...order];
        const [item] = updated.splice(fromIndex, 1);
        updated.splice(targetIndex, 0, item);
        return updated;
      });
    },
    [setOrder],
  );

  const handleDrop = useCallback(
    (targetId: string) =>
      (event: DragEvent<HTMLLIElement>) => {
        event.preventDefault();
        if (!draggingId) return;
        const sourceId = draggingId;
        setOrder((prev) => {
          const order = sanitizeOrder(prev);
          const sourceIndex = order.indexOf(sourceId);
          const destinationIndex = order.indexOf(targetId);
          if (sourceIndex === -1 || destinationIndex === -1 || sourceIndex === destinationIndex) {
            return order;
          }
          const updated = [...order];
          const [item] = updated.splice(sourceIndex, 1);
          updated.splice(destinationIndex, 0, item);
          return updated;
        });
        setDraggingId(null);
      },
    [draggingId, setOrder],
  );

  const handleDragStart = useCallback(
    (id: string) =>
      (event: DragEvent<HTMLLIElement>) => {
        setDraggingId(id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          try {
            event.dataTransfer.setData('text/plain', id);
          } catch {
            // ignore Safari errors
          }
        }
      },
    [],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDragEnd = useCallback(() => setDraggingId(null), []);

  const handleKeyDown = useCallback(
    (id: string) =>
      (event: KeyboardEvent<HTMLLIElement>) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveRelative(id, -1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveRelative(id, 1);
        }
      },
    [moveRelative],
  );

  return {
    draggingId,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleDragEnd,
    handleKeyDown,
  };
};

const Favorites = () => {
  const [order, setOrder] = useFavoritesOrder();
  const { draggingId, handleDragEnd, handleDragOver, handleDragStart, handleDrop, handleKeyDown } =
    useDragReorder(setOrder);

  const favorites = useMemo(
    () => order.map((id) => TOOLS_BY_ID.get(id)).filter((tool): tool is FavoriteTool => Boolean(tool)),
    [order],
  );

  return (
    <section aria-label="Favorite security tools">
      <h2 className="text-lg font-semibold text-white mb-2">Favorites</h2>
      <p className="text-xs text-ub-light mb-3">
        Drag and drop to re-order tools. Use the arrow keys while focused on an item for keyboard reordering.
      </p>
      <ul role="list" className="space-y-2">
        {favorites.map((tool, index) => (
          <li
            key={tool.id}
            role="listitem"
            tabIndex={0}
            draggable
            data-testid={`favorite-item-${tool.id}`}
            onDragStart={handleDragStart(tool.id)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(tool.id)}
            onDragEnd={handleDragEnd}
            onKeyDown={handleKeyDown(tool.id)}
            aria-grabbed={draggingId === tool.id}
            className={`rounded border border-ub-oxford-blue bg-ub-oxford-blue/60 p-3 shadow transition-colors focus:outline-none focus:ring-2 focus:ring-ub-yellow focus:ring-offset-2 focus:ring-offset-ub-dark ${
              draggingId === tool.id ? 'opacity-70' : 'opacity-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-ub-yellow text-lg leading-none select-none">&#8942;</span>
              <div>
                <h3 className="text-sm font-semibold text-white" data-testid={`favorite-name-${tool.id}`}>
                  {index + 1}. {tool.name}
                </h3>
                <p className="text-xs text-ub-light leading-snug">{tool.description}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Favorites;
