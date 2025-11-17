import React, {
  useMemo,
  useRef,
  useState,
  useDeferredValue,
  useEffect,
  useCallback,
} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeList as List,
  ListChildComponentProps,
  FixedSizeList,
} from 'react-window';
import clsx from 'clsx';

const MIN_STRING_LENGTH = 4;
const PRINTABLE_LOW = 0x20;
const PRINTABLE_HIGH = 0x7e;

type StringReference = {
  address?: number | null;
  functionName?: string;
  line?: number;
  context?: string;
};

type RawStringEntry = {
  id?: string;
  value: string;
  address?: number | null;
  references?: StringReference[];
  source?: 'data' | 'memory' | 'code';
};

type NormalizedStringEntry = {
  id: string;
  value: string;
  address: number | null;
  references: StringReference[];
  source: 'data' | 'memory' | 'code';
};

type JumpLocation = {
  address?: number | null;
  functionName?: string;
  line?: number;
  context?: string;
};

type GhidraFunction = {
  name: string;
  code: string[];
};

type StringsProps = {
  initialStrings?: RawStringEntry[];
  bytes?: Uint8Array | number[] | null;
  functions: GhidraFunction[];
  onSelect?: (entry: NormalizedStringEntry) => void;
  onJump?: (location: JumpLocation, entry: NormalizedStringEntry) => void;
  selectedId?: string | null;
  className?: string;
};

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
};

const computeBytesKey = (bytes?: Uint8Array | number[] | null): string => {
  if (!bytes) return 'none';
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const sampleStride = Math.max(1, Math.floor(arr.length / 1024));
  let hash = 0;
  for (let i = 0; i < arr.length; i += sampleStride) {
    hash = (hash * 31 + arr[i]) >>> 0;
  }
  return `${arr.length}-${hash.toString(16)}`;
};

const dedupeReferences = (refs: StringReference[]): StringReference[] => {
  const seen = new Set<string>();
  const results: StringReference[] = [];
  refs.forEach((ref) => {
    const key = `${ref.functionName ?? ''}|${ref.line ?? ''}|${
      ref.address ?? ''
    }|${ref.context ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(ref);
    }
  });
  return results;
};

const normalizeRawEntry = (entry: RawStringEntry, index: number): NormalizedStringEntry => ({
  id: entry.id ?? `data_${index}_${hashString(entry.value)}`,
  value: entry.value,
  address:
    typeof entry.address === 'number'
      ? entry.address
      : entry.address != null
      ? Number(entry.address)
      : null,
  references: entry.references
    ? dedupeReferences(
        entry.references.map((ref) => ({
          address:
            typeof ref.address === 'number'
              ? ref.address
              : ref.address != null
              ? Number(ref.address)
              : null,
          functionName: ref.functionName,
          line:
            typeof ref.line === 'number'
              ? ref.line
              : ref.line != null
              ? Number(ref.line)
              : undefined,
          context: ref.context,
        }))
      )
    : [],
  source: entry.source ?? 'data',
});

const extractStringsFromBytes = (bytes?: Uint8Array | number[] | null): NormalizedStringEntry[] => {
  if (!bytes) return [];
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const results: NormalizedStringEntry[] = [];
  let current: number[] = [];
  let startIndex = 0;

  const flush = () => {
    if (current.length >= MIN_STRING_LENGTH) {
      const value = String.fromCharCode(...current);
      results.push({
        id: `mem_${startIndex.toString(16)}_${hashString(value)}`,
        value,
        address: startIndex,
        references: [
          {
            address: startIndex,
          },
        ],
        source: 'memory',
      });
    }
    current = [];
  };

  for (let i = 0; i < arr.length; i += 1) {
    const byte = arr[i];
    if (byte >= PRINTABLE_LOW && byte <= PRINTABLE_HIGH) {
      if (current.length === 0) {
        startIndex = i;
      }
      current.push(byte);
    } else {
      flush();
    }
  }
  flush();

  return results;
};

const extractStringsFromCode = (functions: GhidraFunction[]): NormalizedStringEntry[] => {
  const literalMap = new Map<string, NormalizedStringEntry>();

  functions.forEach((fn) => {
    fn.code?.forEach((line, idx) => {
      const regex = /"([^"\\]{4,})"|'([^'\\]{4,})'/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const rawValue = match[1] ?? match[2];
        if (!rawValue) continue;
        const value = rawValue.trim();
        if (value.length < MIN_STRING_LENGTH) continue;
        let entry = literalMap.get(value);
        if (!entry) {
          entry = {
            id: `code_${hashString(value)}`,
            value,
            address: null,
            references: [],
            source: 'code',
          };
          literalMap.set(value, entry);
        }
        entry.references.push({
          functionName: fn.name,
          line: idx,
          context: line.trim(),
        });
      }
    });
  });

  return Array.from(literalMap.values());
};

const mergeEntries = (
  sources: NormalizedStringEntry[][]
): NormalizedStringEntry[] => {
  const map = new Map<string, NormalizedStringEntry>();
  const seenKey = new Map<string, string>();

  const addEntry = (entry: NormalizedStringEntry) => {
    const key = `${entry.value}|${entry.address ?? 'na'}`;
    const targetId = seenKey.get(key);
    if (targetId && map.has(targetId)) {
      const existing = map.get(targetId)!;
      existing.references = dedupeReferences([
        ...existing.references,
        ...entry.references,
      ]);
      if (existing.address == null && entry.address != null) {
        existing.address = entry.address;
      }
      if (existing.source !== entry.source) {
        existing.source = existing.source ?? entry.source;
      }
      return;
    }
    const clone: NormalizedStringEntry = {
      ...entry,
      references: dedupeReferences(entry.references),
    };
    map.set(clone.id, clone);
    seenKey.set(key, clone.id);
  };

  sources.forEach((group) => {
    group.forEach(addEntry);
  });

  const sorted = Array.from(map.values());
  sorted.sort((a, b) => {
    if (a.address != null && b.address != null) {
      return a.address - b.address;
    }
    if (a.address != null) return -1;
    if (b.address != null) return 1;
    return a.value.localeCompare(b.value);
  });
  return sorted;
};

const Strings: React.FC<StringsProps> = ({
  initialStrings = [],
  bytes = null,
  functions,
  onSelect,
  onJump,
  selectedId,
  className,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const listRef = useRef<FixedSizeList>(null);
  const memoryCacheRef = useRef(new Map<string, NormalizedStringEntry[]>());

  const bytesKey = useMemo(() => computeBytesKey(bytes), [bytes]);

  const memoryStrings = useMemo(() => {
    if (!bytes) return [];
    const cached = memoryCacheRef.current.get(bytesKey);
    if (cached) return cached;
    const extracted = extractStringsFromBytes(bytes);
    memoryCacheRef.current.set(bytesKey, extracted);
    return extracted;
  }, [bytes, bytesKey]);

  const normalizedInitial = useMemo(
    () => initialStrings.map((entry, idx) => normalizeRawEntry(entry, idx)),
    [initialStrings]
  );

  const codeStrings = useMemo(
    () => extractStringsFromCode(functions || []),
    [functions]
  );

  const entries = useMemo(
    () => mergeEntries([normalizedInitial, memoryStrings, codeStrings]),
    [normalizedInitial, memoryStrings, codeStrings]
  );

  const searchIndex = useMemo(
    () => entries.map((entry) => ({ entry, value: entry.value.toLowerCase() })),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    if (!deferredFilter) return entries;
    const q = deferredFilter.toLowerCase();
    return searchIndex
      .filter((item) => item.value.includes(q))
      .map((item) => item.entry);
  }, [entries, searchIndex, deferredFilter]);

  const activeSelectedId = selectedId ?? internalSelectedId;

  useEffect(() => {
    if (selectedId != null) {
      setInternalSelectedId(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (entries.length === 0) {
      setInternalSelectedId(null);
      return;
    }
    setInternalSelectedId((current) => {
      if (selectedId != null) return current;
      if (current && entries.some((entry) => entry.id === current)) {
        return current;
      }
      const first = entries[0];
      if (first) {
        onSelect?.(first);
        return first.id;
      }
      return null;
    });
  }, [entries, selectedId, onSelect]);

  useEffect(() => {
    if (!activeSelectedId) return;
    const index = filteredEntries.findIndex((entry) => entry.id === activeSelectedId);
    if (index >= 0) {
      listRef.current?.scrollToItem(index, 'smart');
    }
  }, [activeSelectedId, filteredEntries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === activeSelectedId) ?? null,
    [entries, activeSelectedId]
  );

  const handleSelect = useCallback(
    (entry: NormalizedStringEntry, triggerJump: boolean) => {
      if (selectedId == null) {
        setInternalSelectedId(entry.id);
      }
      onSelect?.(entry);
      if (triggerJump && onJump) {
        const primaryRef = entry.references[0];
        onJump(
          {
            address: entry.address ?? primaryRef?.address ?? null,
            functionName: primaryRef?.functionName,
            line: primaryRef?.line,
            context: primaryRef?.context,
          },
          entry
        );
      }
    },
    [onJump, onSelect, selectedId]
  );

  type RowData = {
    items: NormalizedStringEntry[];
    selected: string | null;
    onActivate: (entry: NormalizedStringEntry) => void;
  };

  const rowData = useMemo<RowData>(
    () => ({
      items: filteredEntries,
      selected: activeSelectedId,
      onActivate: (entry: NormalizedStringEntry) => handleSelect(entry, true),
    }),
    [filteredEntries, activeSelectedId, handleSelect]
  );

  const Row = useCallback(
    ({ index, style, data }: ListChildComponentProps<RowData>) => {
      const entry = data.items[index];
      const isSelected = entry.id === data.selected;
      return (
        <div style={style} className="px-1">
          <button
            type="button"
            onClick={() => data.onActivate(entry)}
            className={clsx(
              'w-full flex items-center space-x-2 rounded px-2 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
              isSelected ? 'bg-blue-900/50 text-white' : 'hover:bg-gray-700'
            )}
          >
            <span className="truncate flex-1">{entry.value}</span>
            {entry.address != null && (
              <span className="text-xs text-gray-300">0x{entry.address.toString(16)}</span>
            )}
            <span className="text-xs text-gray-400">{entry.references.length}</span>
          </button>
        </div>
      );
    },
    []
  );

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      <div className="mb-2">
        <label className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
          Strings
        </label>
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter strings"
          aria-label="Filter strings"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-1 text-xs text-gray-400">
          {filteredEntries.length} match{filteredEntries.length === 1 ? '' : 'es'}{' '}
          {filter ? `of ${entries.length}` : ''}
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded border border-gray-800 bg-gray-900">
        {filteredEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No strings found
          </div>
        ) : (
          <AutoSizer>
            {({ width, height }) => (
              <List<RowData>
                ref={listRef}
                height={height}
                width={width}
                itemCount={filteredEntries.length}
                itemSize={36}
                itemData={rowData}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Occurrences
        </h3>
        <div className="mt-1 max-h-40 overflow-auto rounded border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200">
          {!selectedEntry || selectedEntry.references.length === 0 ? (
            <div className="text-gray-500">Select a string to see references.</div>
          ) : (
            <ul className="space-y-2">
              {selectedEntry.references.map((ref, idx) => {
                const key = `${ref.functionName ?? 'mem'}-${ref.line ?? ref.address ?? idx}-${idx}`;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() =>
                        onJump?.(
                          {
                            address: ref.address ?? selectedEntry.address ?? null,
                            functionName: ref.functionName,
                            line: ref.line,
                            context: ref.context,
                          },
                          selectedEntry
                        )
                      }
                      className="w-full text-left hover:underline"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-100">
                          {ref.functionName ?? 'Memory'}
                        </span>
                        <span className="text-gray-400">
                          {ref.address != null
                            ? `0x${ref.address.toString(16)}`
                            : ref.line != null
                            ? `line ${ref.line + 1}`
                            : ''}
                        </span>
                      </div>
                      {ref.context && (
                        <div className="mt-0.5 truncate text-gray-400">{ref.context}</div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export type { NormalizedStringEntry, StringReference };
export default Strings;
