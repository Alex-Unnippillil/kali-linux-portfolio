import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

export type SegmentPermission = 'r' | 'w' | 'x';

export interface MemorySegment {
  id: string;
  name: string;
  start: number;
  end: number;
  size: number;
  permissions: SegmentPermission[];
  type: string;
  symbols?: string[];
}

interface SegmentsProps {
  segments: MemorySegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segment: MemorySegment) => void;
}

const ITEM_HEIGHT = 36;

const permissionLabels: Record<SegmentPermission, string> = {
  r: 'Read',
  w: 'Write',
  x: 'Execute',
};

const OuterElement = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div {...props} data-testid="segments-virtualized-list" ref={ref} />
);
OuterElement.displayName = 'SegmentsOuterElement';

function formatAddress(value: number): string {
  return `0x${value.toString(16).padStart(8, '0')}`;
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

export default function Segments({
  segments,
  selectedSegmentId,
  onSelectSegment,
}: SegmentsProps) {
  const [activePerms, setActivePerms] = useState<Set<SegmentPermission>>(
    new Set<SegmentPermission>(['r', 'w', 'x'])
  );
  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  const togglePerm = useCallback((perm: SegmentPermission) => {
    setActivePerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  }, []);

  const filteredSegments = useMemo(() => {
    if (activePerms.size === 0) return segments;
    const visible = segments.filter((segment) =>
      segment.permissions.some((perm) => activePerms.has(perm))
    );
    if (
      selectedSegmentId &&
      !visible.some((segment) => segment.id === selectedSegmentId)
    ) {
      const selectedSegment = segments.find(
        (segment) => segment.id === selectedSegmentId
      );
      if (selectedSegment) {
        return [selectedSegment, ...visible];
      }
    }
    return visible;
  }, [segments, activePerms, selectedSegmentId]);

  const range = useMemo(() => {
    if (segments.length === 0) {
      return { min: 0, max: 1 };
    }
    const min = segments.reduce(
      (acc, segment) => Math.min(acc, segment.start),
      Number.POSITIVE_INFINITY
    );
    const max = segments.reduce(
      (acc, segment) => Math.max(acc, segment.end),
      Number.NEGATIVE_INFINITY
    );
    return { min, max };
  }, [segments]);

  useEffect(() => {
    if (!selectedSegmentId) return;
    const index = filteredSegments.findIndex(
      (segment) => segment.id === selectedSegmentId
    );
    if (index === -1) return;
    listRef.current?.scrollToItem(index, 'smart');
    const outer = outerRef.current;
    if (outer) {
      const top = index * ITEM_HEIGHT;
      if (typeof outer.scrollTo === 'function') {
        try {
          outer.scrollTo({ top, behavior: 'smooth' });
          return;
        } catch (error) {
          // Fall through to scrollTop assignment when smooth scrolling is unsupported.
        }
      }
      outer.scrollTop = top;
    }
  }, [filteredSegments, selectedSegmentId]);

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const segment = filteredSegments[index];
      if (!segment) return null;
      const isSelected = segment.id === selectedSegmentId;
      return (
        <div
          key={segment.id}
          data-testid={`segment-row-${segment.id}`}
          role="row"
          aria-selected={isSelected}
          style={style}
          className={`grid grid-cols-5 items-center gap-2 border-b border-gray-800 px-3 text-xs md:text-sm ${
            isSelected ? 'bg-yellow-700/40 text-yellow-200' : 'bg-gray-900'
          }`}
          onClick={() => onSelectSegment(segment)}
        >
          <div role="cell" className="truncate font-mono">
            {segment.name}
          </div>
          <div role="cell" className="truncate font-mono">
            {formatAddress(segment.start)}
          </div>
          <div role="cell" className="truncate font-mono">
            {formatAddress(segment.end)}
          </div>
          <div role="cell" className="truncate">
            {formatSize(segment.size)}
          </div>
          <div role="cell" className="truncate uppercase">
            {segment.permissions.join('')}
          </div>
        </div>
      );
    },
    [filteredSegments, onSelectSegment, selectedSegmentId]
  );

  return (
    <section
      aria-label="Memory segments"
      className="flex h-full flex-col overflow-hidden rounded-md border border-gray-800 bg-gray-900"
    >
      <header className="flex items-center gap-3 border-b border-gray-800 px-3 py-2 text-xs uppercase tracking-wide text-gray-300">
        <span className="font-semibold">Segments</span>
        <div className="ml-auto flex items-center gap-2 text-[11px] normal-case md:text-xs">
          {(['r', 'w', 'x'] as SegmentPermission[]).map((perm) => (
            <label key={perm} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={activePerms.has(perm)}
                aria-label={permissionLabels[perm]}
                onChange={() => togglePerm(perm)}
              />
              {permissionLabels[perm]}
            </label>
          ))}
        </div>
      </header>
      <div className="px-3 pb-2 pt-3 text-[11px] md:text-xs">
        <div
          role="list"
          aria-label="Segment address map"
          className="relative flex h-8 items-center gap-1 rounded bg-gray-800"
        >
          {filteredSegments.map((segment) => {
            const width = Math.max(
              ((segment.end - segment.start) / Math.max(range.max - range.min, 1)) * 100,
              0.5
            );
            const left = ((segment.start - range.min) /
              Math.max(range.max - range.min, 1)) * 100;
            const isSelected = segment.id === selectedSegmentId;
            return (
              <button
                type="button"
                key={`range-${segment.id}`}
                role="listitem"
                aria-label={`${segment.name} ${formatAddress(segment.start)} to ${formatAddress(segment.end)}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                className={`absolute h-4 rounded-sm transition-all focus:outline-none ${
                  isSelected ? 'bg-yellow-500 shadow-lg' : 'bg-blue-500/60 hover:bg-blue-400'
                }`}
                onClick={() => onSelectSegment(segment)}
              />
            );
          })}
        </div>
      </div>
      <div className="flex flex-col border-t border-gray-800 text-[11px] md:text-xs">
        <div
          role="row"
          className="grid grid-cols-5 gap-2 border-b border-gray-800 px-3 py-1 font-semibold text-gray-300"
        >
          <div role="columnheader">Name</div>
          <div role="columnheader">Start</div>
          <div role="columnheader">End</div>
          <div role="columnheader">Size</div>
          <div role="columnheader">Perms</div>
        </div>
        <div className="flex-1 min-h-[160px]">
          {filteredSegments.length === 0 ? (
            <p className="px-3 py-4 text-gray-400">
              {segments.length === 0
                ? 'No segments available for this binary.'
                : 'No segments match the selected permissions.'}
            </p>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={filteredSegments.length}
                  itemSize={ITEM_HEIGHT}
                  width={width}
                  outerRef={outerRef}
                  ref={listRef}
                  outerElementType={OuterElement}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          )}
        </div>
      </div>
    </section>
  );
}
