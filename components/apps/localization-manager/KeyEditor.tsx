'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import usePersistentState from '../../../hooks/usePersistentState';

const DEFAULT_STORAGE_KEY = 'localization-manager:drafts';
const KEY_SEPARATOR = '::';

type DraftRecord = Partial<Record<string, string>>;
export type DraftMap = Record<string, DraftRecord>;

export interface LocaleInfo {
  code: string;
  label?: string;
}

export type LocaleDescriptor = string | LocaleInfo;

export interface LocalizationKey {
  namespace: string;
  key: string;
  description?: string;
  translations: Record<string, string>;
}

export interface CompletionStat {
  complete: number;
  total: number;
  percent: number;
}

export interface KeyEditorProps {
  entries: LocalizationKey[];
  locales: LocaleDescriptor[];
  storageKey?: string;
  onEntriesChange?: (entries: LocalizationKey[]) => void;
  onDraftsChange?: (drafts: DraftMap) => void;
}

type PersistentStateHook = [
  DraftMap,
  React.Dispatch<React.SetStateAction<DraftMap>>,
  () => void,
  () => void,
];

function useDraftStore(storageKey: string): PersistentStateHook {
  const [rawDrafts, setRawDrafts, resetDrafts, clearDrafts] = usePersistentState(
    storageKey,
    {} as DraftMap,
  );

  return [
    (rawDrafts ?? {}) as DraftMap,
    setRawDrafts as React.Dispatch<React.SetStateAction<DraftMap>>,
    resetDrafts as () => void,
    clearDrafts as () => void,
  ];
}

const getEntryId = (entry: Pick<LocalizationKey, 'namespace' | 'key'>) =>
  `${entry.namespace}${KEY_SEPARATOR}${entry.key}`;

const normalizeLocale = (locale: LocaleDescriptor): LocaleInfo =>
  typeof locale === 'string'
    ? { code: locale, label: locale }
    : { code: locale.code, label: locale.label ?? locale.code };

const KeyEditor: React.FC<KeyEditorProps> = ({
  entries,
  locales,
  storageKey = DEFAULT_STORAGE_KEY,
  onEntriesChange,
  onDraftsChange,
}) => {
  const localeDescriptors = useMemo(
    () => locales.map((locale) => normalizeLocale(locale)),
    [locales],
  );
  const localeCodes = useMemo(
    () => localeDescriptors.map((locale) => locale.code),
    [localeDescriptors],
  );

  const [drafts, setDrafts, resetDrafts, clearDrafts] = useDraftStore(
    storageKey,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'missing' | 'changed'>('all');

  const tableRef = useRef<HTMLTableElement | null>(null);

  const originalMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    entries.forEach((entry) => {
      const id = getEntryId(entry);
      map[id] = { ...entry.translations };
    });
    return map;
  }, [entries]);

  const originalMapRef = useRef(originalMap);
  useEffect(() => {
    originalMapRef.current = originalMap;
  }, [originalMap]);

  useEffect(() => {
    if (onDraftsChange) {
      onDraftsChange(drafts);
    }
  }, [drafts, onDraftsChange]);

  useEffect(() => {
    const validIds = new Set(entries.map((entry) => getEntryId(entry)));
    const localeSet = new Set(localeCodes);

    setDrafts((prevDrafts) => {
      let updated = false;
      const nextDrafts: DraftMap = {};

      Object.entries(prevDrafts ?? {}).forEach(([id, record]) => {
        if (!validIds.has(id)) {
          updated = true;
          return;
        }

        const source = originalMap[id] ?? {};
        const filtered: DraftRecord = {};

        Object.entries(record ?? {}).forEach(([localeCode, value]) => {
          if (!localeSet.has(localeCode)) {
            updated = true;
            return;
          }

          const baseValue = source[localeCode] ?? '';
          if (value === baseValue) {
            updated = true;
            return;
          }

          if (typeof value === 'string') {
            filtered[localeCode] = value;
          }
        });

        if (Object.keys(filtered).length > 0) {
          nextDrafts[id] = filtered;
          if (
            !record ||
            Object.keys(filtered).length !== Object.keys(record).length
          ) {
            updated = true;
          }
        } else if (record && Object.keys(record).length > 0) {
          updated = true;
        }
      });

      if (!updated) {
        return prevDrafts ?? {};
      }

      return nextDrafts;
    });
  }, [entries, localeCodes, originalMap, setDrafts]);

  const mergedEntries = useMemo(() => {
    return entries.map((entry) => {
      const id = getEntryId(entry);
      const override = drafts[id] ?? {};
      const mergedTranslations: Record<string, string> = {
        ...entry.translations,
      };
      localeCodes.forEach((locale) => {
        if (typeof override[locale] === 'string') {
          mergedTranslations[locale] = override[locale] as string;
        } else if (!mergedTranslations[locale]) {
          mergedTranslations[locale] = '';
        }
      });
      return {
        ...entry,
        translations: mergedTranslations,
      };
    });
  }, [entries, drafts, localeCodes]);

  useEffect(() => {
    if (onEntriesChange) {
      onEntriesChange(mergedEntries);
    }
  }, [mergedEntries, onEntriesChange]);

  const namespaces = useMemo(() => {
    const set = new Set(entries.map((entry) => entry.namespace));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const completionStats = useMemo(() => {
    const stats: Record<string, CompletionStat> = {};
    localeCodes.forEach((code) => {
      stats[code] = {
        complete: 0,
        total: mergedEntries.length,
        percent: 0,
      };
    });

    mergedEntries.forEach((entry) => {
      localeCodes.forEach((code) => {
        const value = entry.translations[code];
        if (value && value.trim().length > 0) {
          stats[code].complete += 1;
        }
      });
    });

    localeCodes.forEach((code) => {
      const stat = stats[code];
      if (stat.total === 0) {
        stat.percent = 100;
      } else {
        stat.percent = Math.round((stat.complete / stat.total) * 100);
      }
    });

    return stats;
  }, [localeCodes, mergedEntries]);

  const changedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    localeCodes.forEach((code) => {
      counts[code] = 0;
    });

    mergedEntries.forEach((entry) => {
      const base = originalMap[getEntryId(entry)] ?? {};
      localeCodes.forEach((code) => {
        const baseValue = base[code] ?? '';
        const currentValue = entry.translations[code] ?? '';
        if (currentValue !== baseValue) {
          counts[code] += 1;
        }
      });
    });

    return counts;
  }, [localeCodes, mergedEntries, originalMap]);

  const filteredEntries = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return mergedEntries.filter((entry) => {
      if (namespaceFilter !== 'all' && entry.namespace !== namespaceFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const base = originalMap[getEntryId(entry)] ?? {};
        const hasMissing = localeCodes.some((code) => {
          const value = entry.translations[code];
          return !value || value.trim().length === 0;
        });
        const hasChanged = localeCodes.some((code) => {
          const baseValue = base[code] ?? '';
          const current = entry.translations[code] ?? '';
          return current !== baseValue;
        });

        if (statusFilter === 'missing' && !hasMissing) {
          return false;
        }
        if (statusFilter === 'changed' && !hasChanged) {
          return false;
        }
      }

      if (!term) {
        return true;
      }

      const haystacks = [
        entry.namespace,
        entry.key,
        entry.description ?? '',
        ...localeCodes.map((code) => entry.translations[code] ?? ''),
      ];
      return haystacks.some((value) => value.toLowerCase().includes(term));
    });
  }, [
    mergedEntries,
    namespaceFilter,
    originalMap,
    localeCodes,
    searchQuery,
    statusFilter,
  ]);

  const rowCount = filteredEntries.length;
  const colCount = localeDescriptors.length;

  const handleTranslationChange = useCallback(
    (entry: LocalizationKey, localeCode: string, value: string) => {
      const entryId = getEntryId(entry);
      const baseValue =
        originalMapRef.current?.[entryId]?.[localeCode] ?? '';

      setDrafts((prevDrafts) => {
        const currentRecord = prevDrafts?.[entryId];

        if (value === baseValue) {
          if (!currentRecord || currentRecord[localeCode] === undefined) {
            return prevDrafts ?? {};
          }

          const { [localeCode]: _removed, ...rest } = currentRecord;
          if (Object.keys(rest).length === 0) {
            const nextDrafts = { ...(prevDrafts ?? {}) };
            delete nextDrafts[entryId];
            return nextDrafts;
          }

          return {
            ...(prevDrafts ?? {}),
            [entryId]: rest,
          };
        }

        if (currentRecord && currentRecord[localeCode] === value) {
          return prevDrafts ?? {};
        }

        return {
          ...(prevDrafts ?? {}),
          [entryId]: {
            ...(currentRecord ?? {}),
            [localeCode]: value,
          },
        };
      });
    },
    [setDrafts],
  );

  const handleResetCell = useCallback(
    (entry: LocalizationKey, localeCode: string) => {
      const baseValue =
        originalMapRef.current?.[getEntryId(entry)]?.[localeCode] ?? '';
      handleTranslationChange(entry, localeCode, baseValue);
    },
    [handleTranslationChange],
  );

  const handleCellKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      const row = Number(target.dataset.row);
      const col = Number(target.dataset.col);

      if (Number.isNaN(row) || Number.isNaN(col)) {
        return;
      }

      let nextRow = row;
      let nextCol = col;

      if (event.key === 'ArrowDown') {
        nextRow = Math.min(rowCount - 1, row + 1);
      } else if (event.key === 'ArrowUp') {
        nextRow = Math.max(0, row - 1);
      } else if (event.key === 'ArrowLeft') {
        const atStart =
          target.selectionStart === 0 && target.selectionEnd === 0;
        if (!atStart) {
          return;
        }
        nextCol = col - 1;
        if (nextCol < 0 && row > 0) {
          nextRow = row - 1;
          nextCol = colCount - 1;
        }
      } else if (event.key === 'ArrowRight') {
        const atEnd =
          target.selectionStart === target.value.length &&
          target.selectionEnd === target.value.length;
        if (!atEnd) {
          return;
        }
        nextCol = col + 1;
        if (nextCol >= colCount && row < rowCount - 1) {
          nextCol = 0;
          nextRow = row + 1;
        }
      } else {
        return;
      }

      event.preventDefault();

      if (nextRow < 0 || nextRow >= rowCount) {
        return;
      }
      if (nextCol < 0 || nextCol >= colCount) {
        return;
      }

      const selector = `textarea[data-row="${nextRow}"][data-col="${nextCol}"]`;
      const nextElement = tableRef.current?.querySelector<HTMLTextAreaElement>(
        selector,
      );
      nextElement?.focus();
    },
    [colCount, rowCount],
  );

  const clearAllDrafts = useCallback(() => {
    resetDrafts();
    clearDrafts();
  }, [clearDrafts, resetDrafts]);

  const resultsSummary = `Showing ${filteredEntries.length} of ${mergedEntries.length} keys`;

  return (
    <div className="flex h-full flex-col gap-4 bg-ub-cool-grey p-4 text-white">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-gray-200">Search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search keys, descriptions, or translations"
            className="w-64 rounded border border-gray-600 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-gray-200">Namespace</span>
          <select
            value={namespaceFilter}
            onChange={(event) => setNamespaceFilter(event.target.value)}
            className="w-48 rounded border border-gray-600 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">All namespaces</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-gray-200">Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
            className="w-44 rounded border border-gray-600 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">All keys</option>
            <option value="missing">Missing translations</option>
            <option value="changed">Changed locally</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setNamespaceFilter('all');
            setStatusFilter('all');
          }}
          className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-100 transition hover:border-cyan-400 hover:text-white"
        >
          Clear filters
        </button>
        <button
          type="button"
          onClick={clearAllDrafts}
          className="rounded border border-red-500 px-3 py-2 text-sm text-red-200 transition hover:border-red-300 hover:text-white"
        >
          Reset local edits
        </button>
      </div>

      <div className="flex flex-wrap gap-4" role="status" aria-live="polite">
        {localeDescriptors.map((locale) => {
          const stats = completionStats[locale.code];
          const changed = changedCounts[locale.code] ?? 0;
          return (
            <div
              key={locale.code}
              className="min-w-[12rem] rounded border border-gray-700 bg-black/30 p-3 text-sm"
              aria-label={`${locale.label ?? locale.code} completion`}
            >
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-semibold text-gray-100">
                  {locale.label ?? locale.code}
                </span>
                <span>{stats.percent}%</span>
              </div>
              <meter
                className="mt-2 h-2 w-full"
                min={0}
                max={stats.total || 1}
                value={stats.complete}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
                <span>
                  {stats.complete}/{stats.total} complete
                </span>
                <span className={changed > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                  {changed > 0 ? `${changed} changed` : 'In sync'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sr-only" aria-live="polite">
        {resultsSummary}
      </div>
      <p className="text-sm text-gray-300">{resultsSummary}</p>

      <div className="overflow-auto rounded border border-gray-700">
        <table
          ref={tableRef}
          className="min-w-full divide-y divide-gray-700 text-left text-sm"
        >
          <thead className="bg-black/40 text-xs uppercase text-gray-300">
            <tr>
              <th scope="col" className="px-3 py-2">
                Namespace
              </th>
              <th scope="col" className="px-3 py-2">
                Key
              </th>
              <th scope="col" className="px-3 py-2">
                Description
              </th>
              {localeDescriptors.map((locale) => (
                <th scope="col" className="px-3 py-2" key={locale.code}>
                  {locale.label ?? locale.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredEntries.map((entry, rowIndex) => {
              const id = getEntryId(entry);
              const base = originalMap[id] ?? {};
              return (
                <tr key={id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-cyan-200">
                    {entry.namespace}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-cyan-100">
                    {entry.key}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-200">
                    {entry.description ? (
                      entry.description
                    ) : (
                      <span className="italic text-gray-500">
                        No description
                      </span>
                    )}
                  </td>
                  {localeDescriptors.map((locale, colIndex) => {
                    const localeCode = locale.code;
                    const currentValue = entry.translations[localeCode] ?? '';
                    const baseValue = base[localeCode] ?? '';
                    const isChanged = currentValue !== baseValue;
                    const isMissing = currentValue.trim().length === 0;
                    const textareaId = `${id}-${localeCode}`;

                    return (
                      <td key={localeCode} className="min-w-[16rem] px-3 py-2">
                        <div className="space-y-1">
                          <label className="sr-only" htmlFor={textareaId}>
                            {`Translation for ${entry.key} in ${
                              locale.label ?? localeCode
                            }`}
                          </label>
                          <textarea
                            id={textareaId}
                            data-row={rowIndex}
                            data-col={colIndex}
                            value={currentValue}
                            onChange={(event) =>
                              handleTranslationChange(
                                entry,
                                localeCode,
                                event.target.value,
                              )
                            }
                            onKeyDown={handleCellKeyDown}
                            rows={Math.min(
                              8,
                              Math.max(2, currentValue.split('\n').length),
                            )}
                            aria-invalid={isMissing || undefined}
                            aria-describedby={`${textareaId}-status`}
                            className={clsx(
                              'w-full resize-y rounded border bg-black/40 p-2 text-sm text-white focus:outline-none focus:ring-2',
                              isChanged
                                ? 'border-amber-400 focus:border-amber-300 focus:ring-amber-300'
                                : 'border-gray-700 focus:border-cyan-300 focus:ring-cyan-300',
                              isMissing && 'bg-black/30',
                            )}
                          />
                          <div
                            id={`${textareaId}-status`}
                            className="flex items-center justify-between text-xs text-gray-300"
                          >
                            <span>
                              {isMissing ? 'Missing translation' : 'Complete'}
                            </span>
                            <span
                              className={clsx(
                                'font-semibold',
                                isChanged ? 'text-amber-300' : 'text-emerald-300',
                              )}
                            >
                              {isChanged ? 'Changed' : 'In sync'}
                            </span>
                          </div>
                          {isChanged && (
                            <button
                              type="button"
                              onClick={() => handleResetCell(entry, localeCode)}
                              className="text-xs text-cyan-300 underline transition hover:text-cyan-100"
                            >
                              Revert to source
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td
                  colSpan={3 + localeDescriptors.length}
                  className="px-3 py-12 text-center text-sm text-gray-300"
                >
                  No keys match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KeyEditor;
