import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { List, ListImperativeAPI } from 'react-window';

type FilterType = 'all' | 'string' | 'constant';

export interface DataReferenceLocation {
  function: string;
  offset: number | string;
}

export interface DataReference {
  id: string;
  targetId: string;
  targetType: 'string' | 'constant' | string;
  value: string;
  location: DataReferenceLocation;
  preview?: string;
}

export interface NormalizedReference extends DataReference {
  searchText: string;
  originalIndex: number;
}

export interface DataXrefsProps {
  /**
   * Optional external dataset. If omitted the component will fetch
   * `/demo-data/ghidra/data-xrefs.json`.
   */
  references?: DataReference[];
  /**
   * Override the URL used when `references` are not provided.
   */
  sourceUrl?: string;
  /**
   * Callback fired whenever the selection changes. Used by the Ghidra app to
   * jump to the referenced function.
   */
  onNavigate?: (reference: DataReference) => void;
  /**
   * Controls the height of the virtualized list container in pixels.
   */
  height?: number;
  /**
   * Function name that should be emphasised when visible.
   */
  activeFunction?: string | null;
}

const DEFAULT_SOURCE = '/demo-data/ghidra/data-xrefs.json';
const ROW_HEIGHT = 64;
const DEFAULT_HEIGHT = 320;

export function createNormalizedReferences(
  references: DataReference[]
): NormalizedReference[] {
  return references.map((ref, index) => ({
    ...ref,
    originalIndex: index,
    searchText: `${ref.targetId} ${ref.targetType} ${ref.value} ${ref.location.function} ${ref.location.offset} ${
      ref.preview || ''
    }`
      .replace(/\s+/g, ' ')
      .toLowerCase(),
  }));
}

export function buildReferenceIndex(
  references: DataReference[]
): Map<string, number> {
  const map = new Map<string, number>();
  references.forEach((ref, index) => {
    map.set(ref.id, index);
  });
  return map;
}

export function filterNormalizedReferences(
  references: NormalizedReference[],
  query: string,
  filter: FilterType
): NormalizedReference[] {
  if (!query && filter === 'all') {
    return references;
  }
  const normalizedQuery = query.trim().toLowerCase();
  return references.filter((ref) => {
    if (filter !== 'all' && ref.targetType !== filter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return ref.searchText.includes(normalizedQuery);
  });
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  items: NormalizedReference[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  activeFunction?: string | null;
}

const ListRow: React.FC<RowProps> = ({
  index,
  style,
  items,
  onSelect,
  selectedId,
  activeFunction,
}) => {
  const ref = items[index];
  if (!ref) {
    return null;
  }
  const isSelected = selectedId === ref.id;
  const isActiveFunction =
    activeFunction && ref.location.function === activeFunction;

  return (
    <div
      style={style}
      role="listitem"
      aria-selected={isSelected}
      className={`px-2 py-1 ${
        isSelected
          ? 'bg-slate-700'
          : isActiveFunction
            ? 'bg-slate-800/60'
            : index % 2 === 0
              ? 'bg-slate-900/40'
              : 'bg-slate-900/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(ref.id)}
        className="w-full text-left focus:outline-none focus-visible:ring focus-visible:ring-yellow-400 rounded"
        data-testid="xref-row-button"
        aria-label={`Select reference ${ref.value} in ${ref.location.function}`}
      >
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span className="uppercase tracking-wide">{ref.targetType}</span>
          <span>{ref.location.function}</span>
        </div>
        <div className="text-sm text-white truncate" title={ref.value}>
          {ref.value}
        </div>
        <div className="text-xs text-gray-400 truncate">
          @ {ref.location.offset}
        </div>
        {ref.preview ? (
          <div className="text-xs text-gray-400 truncate" title={ref.preview}>
            {ref.preview}
          </div>
        ) : null}
      </button>
    </div>
  );
};

const DataXrefs: React.FC<DataXrefsProps> = ({
  references: providedReferences,
  sourceUrl = DEFAULT_SOURCE,
  onNavigate,
  height = DEFAULT_HEIGHT,
  activeFunction = null,
}) => {
  const listRef = useRef<ListImperativeAPI | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [references, setReferences] = useState<DataReference[]>(
    providedReferences || []
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    providedReferences ? 'ready' : 'idle'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isClient, setIsClient] = useState(false);
  const [listDimensions, setListDimensions] = useState({
    width: 320,
    height,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      setListDimensions({
        width: node.clientWidth || 320,
        height: node.clientHeight || height,
      });
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [height, isClient]);

  useEffect(() => {
    if (providedReferences) {
      setReferences(providedReferences);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    fetch(sourceUrl)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const refs = Array.isArray(data?.references) ? data.references : [];
        setReferences(refs);
        setStatus('ready');
        if (refs[0]) {
          setSelectedId(refs[0].id);
          setHistory([refs[0].id]);
          setHistoryIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providedReferences, sourceUrl]);

  const normalized = useMemo(
    () => createNormalizedReferences(references),
    [references]
  );

  const indexMap = useMemo(
    () => buildReferenceIndex(references),
    [references]
  );

  const filtered = useMemo(
    () => filterNormalizedReferences(normalized, query, filter),
    [normalized, query, filter]
  );

  const filteredIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((ref, idx) => map.set(ref.id, idx));
    return map;
  }, [filtered]);

  const selectedRef = useMemo(() => {
    if (!selectedId) return null;
    const baseIndex = indexMap.get(selectedId);
    if (baseIndex === undefined) return null;
    return normalized[baseIndex] || null;
  }, [indexMap, normalized, selectedId]);

  const updateLiveRegion = useCallback(
    (ref: DataReference | null) => {
      if (!liveRegionRef.current) return;
      if (!ref) {
        liveRegionRef.current.textContent = 'No reference selected.';
        return;
      }
      liveRegionRef.current.textContent = `Selected reference ${ref.value} in ${ref.location.function} at offset ${ref.location.offset}.`;
    },
    []
  );

  useEffect(() => {
    updateLiveRegion(selectedRef);
  }, [selectedRef, updateLiveRegion]);

  const handleSelect = useCallback(
    (id: string, pushHistory = true) => {
      const baseIndex = indexMap.get(id);
      if (baseIndex === undefined) return;
      const ref = references[baseIndex];
      setSelectedId(id);
      if (pushHistory) {
        setHistory((prev) => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(id);
          return next;
        });
        setHistoryIndex((idx) => idx + 1);
      }
      const visibleIndex = filteredIndexMap.get(id);
      if (visibleIndex !== undefined) {
        listRef.current?.scrollToRow({ index: visibleIndex, align: 'smart' });
      }
      onNavigate?.(ref);
      updateLiveRegion(ref);
    },
    [filteredIndexMap, historyIndex, indexMap, onNavigate, references, updateLiveRegion]
  );

  const goBack = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx <= 0) return idx;
      const nextIndex = idx - 1;
      const id = history[nextIndex];
      if (id) {
        handleSelect(id, false);
      }
      return nextIndex;
    });
  }, [handleSelect, history]);

  const goForward = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx >= history.length - 1) return idx;
      const nextIndex = idx + 1;
      const id = history[nextIndex];
      if (id) {
        handleSelect(id, false);
      }
      return nextIndex;
    });
  }, [handleSelect, history]);

  useEffect(() => {
    if (!selectedId && filtered[0]) {
      handleSelect(filtered[0].id, true);
    }
  }, [filtered, handleSelect, selectedId]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'loading':
        return 'Loading references…';
      case 'error':
        return 'Unable to load references.';
      case 'ready':
        if (filtered.length === 0) {
          return 'No references match the current filters.';
        }
        return `${filtered.length} references ready.`;
      default:
        return '';
    }
  }, [filtered.length, status]);

  return (
    <section
      className="flex h-full flex-col gap-2 p-2 text-white"
      aria-label="Data cross references"
    >
      <header className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="xref-query" className="sr-only">
            Search data references
          </label>
          <input
            id="xref-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search references"
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="xref-filter" className="text-xs text-gray-300">
            Filter
          </label>
          <select
            id="xref-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterType)}
            className="rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="string">Strings</option>
            <option value="constant">Constants</option>
          </select>
        </div>
        <div className="flex items-center gap-2" aria-label="Reference navigation controls">
          <button
            type="button"
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs disabled:opacity-40"
            aria-label="Go to previous reference"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={historyIndex === -1 || historyIndex >= history.length - 1}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs disabled:opacity-40"
            aria-label="Go to next reference"
          >
            ▶
          </button>
        </div>
      </header>

      <p className="text-xs text-gray-300" aria-live="polite">
        {statusMessage}
      </p>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden rounded border border-slate-700"
        style={{ height }}
      >
        {isClient ? (
          <List
            listRef={listRef}
            defaultHeight={height}
            style={{
              height: listDimensions.height,
              width: listDimensions.width,
            }}
            rowCount={filtered.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={ListRow}
            rowProps={{
              items: filtered,
              onSelect: handleSelect,
              selectedId,
              activeFunction,
            }}
          />
        ) : (
          <div className="p-4 text-sm text-gray-400">Preparing list…</div>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="rounded border border-slate-700 bg-slate-900 p-2 text-xs text-gray-200"
        data-testid="xref-selection-status"
        ref={liveRegionRef}
      >
        {selectedRef
          ? `Selected reference ${selectedRef.value} in ${selectedRef.location.function}.`
          : 'No reference selected.'}
      </div>

      {selectedRef ? (
        <dl className="grid grid-cols-1 gap-2 rounded border border-slate-700 bg-slate-900 p-2 text-xs text-gray-200 md:grid-cols-2">
          <div>
            <dt className="font-semibold text-gray-100">Target</dt>
            <dd>{selectedRef.targetId}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Type</dt>
            <dd>{selectedRef.targetType}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Function</dt>
            <dd>{selectedRef.location.function}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-100">Offset</dt>
            <dd>{selectedRef.location.offset}</dd>
          </div>
          {selectedRef.preview ? (
            <div className="md:col-span-2">
              <dt className="font-semibold text-gray-100">Preview</dt>
              <dd className="font-mono text-[11px] text-gray-300">
                {selectedRef.preview}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
};

export default DataXrefs;
