import React, { useEffect, useMemo, useState } from 'react';
import type {
  SmartFolder,
  SmartFolderFilter,
  SmartFolderSortField,
  SmartFolderSortDirection,
} from '../../../data/files/smart-folder-templates';

const BYTES_PER_MB = 1024 * 1024;

type FilterKind = SmartFolderFilter['kind'];

interface SmartFolderEditorProps {
  folder: SmartFolder;
  onSave: (folder: SmartFolder) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const FILTER_LABELS: Record<FilterKind, string> = {
  date: 'Date',
  size: 'File size',
  path: 'Path match',
  duplicate: 'Duplicates',
};

const SmartFolderEditor: React.FC<SmartFolderEditorProps> = ({
  folder,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [draft, setDraft] = useState<SmartFolder>(folder);
  const [newFilterKind, setNewFilterKind] = useState<FilterKind | ''>('');

  useEffect(() => {
    setDraft(folder);
    setNewFilterKind('');
  }, [folder]);

  const handleFilterChange = (
    index: number,
    updater: (filter: SmartFolderFilter) => SmartFolderFilter,
  ) => {
    setDraft((current) => {
      const nextFilters = current.filters.map((filter, i) =>
        i === index ? updater(filter) : filter,
      );
      return {
        ...current,
        filters: nextFilters,
      };
    });
  };

  const addFilter = (kind: FilterKind) => {
    const base: SmartFolderFilter =
      kind === 'date'
        ? { kind: 'date', field: 'lastModified', withinDays: 7 }
        : kind === 'size'
        ? { kind: 'size', operator: 'gte', bytes: 5 * BYTES_PER_MB }
        : kind === 'path'
        ? { kind: 'path', operator: 'includes', value: 'documents' }
        : { kind: 'duplicate', basis: 'name-and-size' };

    setDraft((current) => ({
      ...current,
      filters: [...current.filters, base],
    }));
    setNewFilterKind('');
  };

  const removeFilter = (index: number) => {
    setDraft((current) => ({
      ...current,
      filters: current.filters.filter((_, i) => i !== index),
    }));
  };

  const handleSortFieldChange = (value: SmartFolderSortField | 'none') => {
    setDraft((current) => {
      if (value === 'none') {
        const { sort, ...rest } = current;
        void sort;
        return { ...rest } as SmartFolder;
      }

      const direction: SmartFolderSortDirection =
        current.sort?.direction ?? (value === 'name' ? 'asc' : 'desc');

      return {
        ...current,
        sort: {
          field: value,
          direction,
        },
      };
    });
  };

  const handleSortDirectionChange = (value: SmartFolderSortDirection) => {
    setDraft((current) =>
      current.sort
        ? {
            ...current,
            sort: {
              ...current.sort,
              direction: value,
            },
          }
        : current,
    );
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
  };

  const filterSummary = useMemo(
    () =>
      draft.filters
        .map((filter) => FILTER_LABELS[filter.kind])
        .join(', '),
    [draft.filters],
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-ub-cool-grey text-white shadow-xl">
        <form onSubmit={save} className="flex flex-col gap-4 p-6">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">Edit smart folder</h2>
            <p className="text-xs text-gray-300">
              {filterSummary ? `Filters: ${filterSummary}` : 'Add at least one filter to collect matches.'}
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Display name</span>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="mb-1 font-medium">Accent</span>
              <input
                type="color"
                value={draft.accentColor ?? '#2563eb'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    accentColor: event.target.value,
                  }))
                }
                className="h-10 w-full cursor-pointer rounded border border-gray-600 bg-transparent"
                aria-label="Select accent color"
              />
            </label>

            <label className="col-span-full flex flex-col text-sm">
              <span className="mb-1 font-medium">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={2}
                className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
              />
            </label>

            <div className="col-span-full flex flex-col gap-2 text-sm">
              <span className="font-medium">Sorting</span>
              <div className="flex flex-wrap gap-2">
                <select
                  value={draft.sort?.field ?? 'none'}
                  onChange={(event) =>
                    handleSortFieldChange(event.target.value as SmartFolderSortField | 'none')
                  }
                  className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                >
                  <option value="none">Manual (unsorted)</option>
                  <option value="lastModified">Modified date</option>
                  <option value="size">Size</option>
                  <option value="name">Name</option>
                </select>
                {draft.sort && (
                  <select
                    value={draft.sort.direction}
                    onChange={(event) =>
                      handleSortDirectionChange(event.target.value as SmartFolderSortDirection)
                    }
                    className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Filters
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={newFilterKind}
                  onChange={(event) =>
                    setNewFilterKind(event.target.value as FilterKind | '')
                  }
                  className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                >
                  <option value="">Add filter…</option>
                  <option value="date">Date</option>
                  <option value="size">File size</option>
                  <option value="path">Path match</option>
                  <option value="duplicate">Duplicates</option>
                </select>
                <button
                  type="button"
                  onClick={() => newFilterKind && addFilter(newFilterKind)}
                  disabled={!newFilterKind}
                  className="rounded bg-ub-orange px-3 py-1 text-sm font-medium text-black disabled:cursor-not-allowed disabled:bg-opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {draft.filters.length === 0 && (
              <p className="rounded border border-dashed border-gray-600 p-3 text-sm text-gray-300">
                Add at least one filter to build your smart folder criteria.
              </p>
            )}

            <div className="space-y-3">
              {draft.filters.map((filter, index) => (
                <div
                  key={`${filter.kind}-${index}`}
                  className="rounded border border-gray-700 bg-black bg-opacity-30 p-3 text-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{FILTER_LABELS[filter.kind]}</span>
                    <button
                      type="button"
                      onClick={() => removeFilter(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  {filter.kind === 'date' && (
                    <div className="space-y-2">
                      <label className="flex flex-col">
                        <span className="text-xs text-gray-300">Within the last (days)</span>
                        <input
                          type="number"
                          min={0}
                          value={filter.withinDays}
                          onChange={(event) =>
                            handleFilterChange(index, (current) => ({
                              ...current,
                              withinDays: Math.max(0, Number(event.target.value) || 0),
                            }))
                          }
                          className="mt-1 w-32 rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        />
                      </label>
                      <p className="text-xs text-gray-400">
                        Zero includes only files touched today. Increase the value for rolling windows.
                      </p>
                    </div>
                  )}

                  {filter.kind === 'size' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <span className="text-xs text-gray-300">Minimum size</span>
                        <input
                          type="number"
                          min={1}
                          value={Math.max(1, Math.round(filter.bytes / BYTES_PER_MB))}
                          onChange={(event) => {
                            const nextMb = Math.max(1, Number(event.target.value) || 1);
                            handleFilterChange(index, (current) => ({
                              ...current,
                              bytes: nextMb * BYTES_PER_MB,
                            }));
                          }}
                          className="w-24 rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        />
                        <span className="text-xs text-gray-300">MB</span>
                      </label>
                      <p className="text-xs text-gray-400">
                        Adjust the threshold to focus on media, archives, or other heavy assets.
                      </p>
                    </div>
                  )}

                  {filter.kind === 'path' && (
                    <div className="space-y-2">
                      <label className="flex flex-col">
                        <span className="text-xs text-gray-300">Match value</span>
                        <input
                          value={filter.value}
                          onChange={(event) =>
                            handleFilterChange(index, (current) => ({
                              ...current,
                              value: event.target.value,
                            }))
                          }
                          className="mt-1 rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                          placeholder="downloads"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300">
                        <select
                          value={filter.operator}
                          onChange={(event) =>
                            handleFilterChange(index, (current) => ({
                              ...current,
                              operator: event.target.value as typeof filter.operator,
                            }))
                          }
                          className="rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        >
                          <option value="includes">Contains</option>
                          <option value="startsWith">Starts with</option>
                        </select>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={!!filter.caseSensitive}
                            onChange={(event) =>
                              handleFilterChange(index, (current) => ({
                                ...current,
                                caseSensitive: event.target.checked,
                              }))
                            }
                          />
                          <span>Match case</span>
                        </label>
                      </label>
                    </div>
                  )}

                  {filter.kind === 'duplicate' && (
                    <div className="space-y-2">
                      <label className="flex flex-col">
                        <span className="text-xs text-gray-300">Duplicate rule</span>
                        <select
                          value={filter.basis}
                          onChange={(event) =>
                            handleFilterChange(index, (current) => ({
                              ...current,
                              basis: event.target.value as typeof filter.basis,
                            }))
                          }
                          className="mt-1 rounded border border-gray-600 bg-black bg-opacity-30 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        >
                          <option value="name-and-size">Same name & size</option>
                          <option value="name">Same name only</option>
                          <option value="size">Same size only</option>
                        </select>
                      </label>
                      <p className="text-xs text-gray-400">
                        Duplicate filters run after other rules so you can scope the audit to a project path first.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-gray-700 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="self-start rounded border border-red-500 px-3 py-1 text-red-300 hover:bg-red-500 hover:bg-opacity-20"
              >
                Delete folder
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-black hover:bg-opacity-30"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-ub-orange px-4 py-1 font-semibold text-black"
              >
                Save changes
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default SmartFolderEditor;
