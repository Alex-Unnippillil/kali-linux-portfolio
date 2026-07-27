import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

type SwipeState = {
  pointerId: number;
  itemId: string;
  startX: number;
  startY: number;
  baseOffset: number;
  isSwiping: boolean;
};

const ACTION_WIDTH = 152;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const defaultEmptyState = (
  <div className="flex flex-col items-center gap-2 text-sm text-white/60">
    <span className="text-base font-medium text-white">Archive is empty</span>
    <span>Add items to the archive to revisit them later.</span>
  </div>
);

const buildInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '•';
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export type ArchiveItem = {
  id: string;
  title: string;
  description?: string;
  meta?: string;
  icon?: string | ReactNode;
};

type ArchiveListProps = {
  heading?: string;
  items: ArchiveItem[];
  onSelect?: (item: ArchiveItem) => void;
  onDelete?: (item: ArchiveItem) => void;
  onShare?: (item: ArchiveItem) => void;
  emptyState?: ReactNode;
};

export default function ArchiveList({
  heading = 'Archive',
  items,
  onSelect,
  onDelete,
  onShare,
  emptyState = defaultEmptyState,
}: ArchiveListProps) {
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const swipeState = useRef<SwipeState | null>(null);
  const ignoreClickRef = useRef(false);
  const offsetsRef = useRef(offsets);
  const openItemRef = useRef(openItem);

  useEffect(() => {
    offsetsRef.current = offsets;
  }, [offsets]);

  useEffect(() => {
    openItemRef.current = openItem;
  }, [openItem]);

  useEffect(() => {
    const current = openItemRef.current;
    if (!current) return;
    if (items.some((item) => item.id === current)) return;
    setOpenItem(null);
    setOffsets((prev) => {
      if (!(current in prev)) return prev;
      const next = { ...prev };
      delete next[current];
      return next;
    });
  }, [items]);

  const finalizeSwipe = useCallback((itemId: string, shouldOpen: boolean) => {
    setOffsets((prev) => {
      let changed = false;
      const next = { ...prev };

      if (shouldOpen) {
        const previouslyOpen = openItemRef.current;
        if (
          previouslyOpen &&
          previouslyOpen !== itemId &&
          (next[previouslyOpen] ?? 0) !== 0
        ) {
          next[previouslyOpen] = 0;
          changed = true;
        }
        if ((next[itemId] ?? 0) !== -ACTION_WIDTH) {
          next[itemId] = -ACTION_WIDTH;
          changed = true;
        }
      } else if ((next[itemId] ?? 0) !== 0) {
        next[itemId] = 0;
        changed = true;
      }

      return changed ? next : prev;
    });
    setOpenItem(shouldOpen ? itemId : null);
  }, []);

  const closeOpenItem = useCallback(() => {
    const current = openItemRef.current;
    if (current) {
      finalizeSwipe(current, false);
    }
  }, [finalizeSwipe]);

  const handlePointerDown = useCallback(
    (itemId: string) => (event: PointerEvent<HTMLDivElement>) => {
      const currentlyOpen = openItemRef.current;
      if (currentlyOpen && currentlyOpen !== itemId) {
        finalizeSwipe(currentlyOpen, false);
      }

      swipeState.current = {
        pointerId: event.pointerId,
        itemId,
        startX: event.clientX,
        startY: event.clientY,
        baseOffset: offsetsRef.current[itemId] ?? 0,
        isSwiping: false,
      };

      if (event.pointerType !== 'mouse') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      setDraggingId(null);
    },
    [finalizeSwipe],
  );

  const handlePointerMove = useCallback((itemId: string) => {
    return (event: PointerEvent<HTMLDivElement>) => {
      const state = swipeState.current;
      if (!state || state.itemId !== itemId || state.pointerId !== event.pointerId)
        return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;

      if (!state.isSwiping) {
        if (Math.abs(deltaX) < 6 || Math.abs(deltaX) < Math.abs(deltaY)) {
          return;
        }
        state.isSwiping = true;
        setDraggingId(itemId);
      }

      event.preventDefault();

      const nextOffset = clamp(state.baseOffset + deltaX, -ACTION_WIDTH, 0);
      setOffsets((prev) => {
        if ((prev[itemId] ?? 0) === nextOffset) return prev;
        return { ...prev, [itemId]: nextOffset };
      });
    };
  }, []);

  const handlePointerEnd = useCallback(
    (itemId: string) => (event: PointerEvent<HTMLDivElement>) => {
      const state = swipeState.current;
      if (!state || state.itemId !== itemId || state.pointerId !== event.pointerId)
        return;

      const offset = offsetsRef.current[itemId] ?? 0;
      const shouldOpen = offset <= -OPEN_THRESHOLD;
      finalizeSwipe(itemId, shouldOpen);

      if (state.isSwiping) {
        ignoreClickRef.current = true;
      }

      swipeState.current = null;
      setDraggingId((prev) => (prev === itemId ? null : prev));

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [finalizeSwipe],
  );

  const handlePointerCancel = useCallback(
    (itemId: string) => (event: PointerEvent<HTMLDivElement>) => {
      const state = swipeState.current;
      if (!state || state.itemId !== itemId || state.pointerId !== event.pointerId)
        return;

      const offset = offsetsRef.current[itemId] ?? 0;
      const shouldOpen = offset <= -OPEN_THRESHOLD;
      finalizeSwipe(itemId, shouldOpen);

      if (state.isSwiping) {
        ignoreClickRef.current = true;
      }

      swipeState.current = null;
      setDraggingId((prev) => (prev === itemId ? null : prev));

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [finalizeSwipe],
  );

  const handleRowClick = useCallback(
    (item: ArchiveItem) => () => {
      if (ignoreClickRef.current) {
        ignoreClickRef.current = false;
        return;
      }

      const wasOpen = openItemRef.current === item.id;
      closeOpenItem();
      finalizeSwipe(item.id, false);
      if (wasOpen) return;
      onSelect?.(item);
    },
    [closeOpenItem, finalizeSwipe, onSelect],
  );

  const handleRowKeyDown = useCallback(
    (item: ArchiveItem) => (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRowClick(item)();
      } else if (event.key === 'Escape' && openItemRef.current === item.id) {
        event.preventDefault();
        finalizeSwipe(item.id, false);
      } else if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        openItemRef.current === item.id
      ) {
        event.preventDefault();
        onDelete?.(item);
        finalizeSwipe(item.id, false);
      }
    },
    [finalizeSwipe, handleRowClick, onDelete],
  );

  const handleShare = useCallback(
    (item: ArchiveItem) => (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      finalizeSwipe(item.id, false);
      onShare?.(item);
    },
    [finalizeSwipe, onShare],
  );

  const handleDelete = useCallback(
    (item: ArchiveItem) => (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      finalizeSwipe(item.id, false);
      onDelete?.(item);
    },
    [finalizeSwipe, onDelete],
  );

  const itemCountLabel = useMemo(
    () => `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
    [items.length],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ub-cool-grey bg-opacity-95 px-4 py-3 text-xs uppercase tracking-wide backdrop-blur">
        <span className="font-semibold text-sm normal-case tracking-tight">{heading}</span>
        <span className="text-xs text-white/60">{itemCountLabel}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center">
            {emptyState}
          </div>
        ) : (
          <ul role="list" className="space-y-2">
            {items.map((item) => {
              const offset = offsets[item.id] ?? 0;
              const progress = Math.min(1, Math.abs(offset) / ACTION_WIDTH);
              const initials = buildInitials(item.title);

              return (
                <li key={item.id} className="relative">
                  <div
                    className="pointer-events-none absolute inset-y-1 right-1 flex w-[152px] items-center justify-end gap-2 rounded-lg bg-white/10 px-2 py-1"
                    style={{ opacity: 0.35 + progress * 0.65 }}
                  >
                    <button
                      type="button"
                      onClick={handleShare(item)}
                      className="pointer-events-auto rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      aria-label={`Share ${item.title}`}
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete(item)}
                      className="pointer-events-auto rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      aria-label={`Delete ${item.title}`}
                    >
                      Delete
                    </button>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-left text-sm shadow-sm outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400"
                    style={{
                      transform: `translateX(${offset}px)`,
                      transition:
                        draggingId === item.id
                          ? 'none'
                          : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
                      touchAction: 'pan-y',
                    }}
                    onPointerDown={handlePointerDown(item.id)}
                    onPointerMove={handlePointerMove(item.id)}
                    onPointerUp={handlePointerEnd(item.id)}
                    onPointerCancel={handlePointerCancel(item.id)}
                    onClick={handleRowClick(item)}
                    onKeyDown={handleRowKeyDown(item)}
                  >
                    {item.icon ? (
                      typeof item.icon === 'string' ? (
                        <img
                          src={item.icon}
                          alt=""
                          className="h-10 w-10 flex-none rounded-md object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-white/10 text-lg">
                          {item.icon}
                        </span>
                      )
                    ) : (
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-white/10 text-xs font-semibold uppercase text-white/70">
                        {initials}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-white">{item.title}</span>
                      {item.description && (
                        <span className="truncate text-xs text-white/70">{item.description}</span>
                      )}
                    </div>
                    {item.meta && (
                      <span className="ml-3 shrink-0 text-xs text-white/50">{item.meta}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
