'use client';

import React, {
  FormEvent,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface TargetEntry {
  id: string;
  value: string;
  context: string;
  tags: string[];
  createdAt: number;
}

interface TargetNotebookContextValue {
  targets: TargetEntry[];
  filteredTargets: TargetEntry[];
  contexts: string[];
  activeTags: string[];
  addTarget: (value: string, context: string, tags?: string[]) => void;
  updateTags: (id: string, tags: string[]) => void;
  removeTarget: (id: string) => void;
  toggleTagFilter: (tag: string) => void;
  clearFilters: () => void;
}

const isTargetEntryArray = (value: unknown): value is TargetEntry[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as TargetEntry).id === 'string' &&
      typeof (entry as TargetEntry).value === 'string' &&
      typeof (entry as TargetEntry).context === 'string' &&
      Array.isArray((entry as TargetEntry).tags) &&
      (entry as TargetEntry).tags.every((tag) => typeof tag === 'string') &&
      typeof (entry as TargetEntry).createdAt === 'number',
  );

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const TARGETS_STORAGE_KEY = 'reconng-target-notebook';
const TAG_FILTER_STORAGE_KEY = 'reconng-target-filters';

const TargetNotebookContext =
  createContext<TargetNotebookContextValue | null>(null);

const normalizeTags = (tags: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  });
  return result;
};

const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const TargetNotebookProvider: React.FC<{ children: React.ReactNode }>
  = ({ children }) => {
    const [targets, setTargets] = usePersistentState<TargetEntry[]>(
      TARGETS_STORAGE_KEY,
      [],
      isTargetEntryArray,
    );
    const [activeTags, setActiveTags] = usePersistentState<string[]>(
      TAG_FILTER_STORAGE_KEY,
      [],
      isStringArray,
    );

    const contexts = useMemo(() => {
      const set = new Set<string>();
      targets.forEach((entry) => set.add(entry.context));
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [targets]);

    const filteredTargets = useMemo(() => {
      if (activeTags.length === 0) {
        return targets;
      }
      const normalized = activeTags.map((tag) => tag.toLowerCase());
      return targets.filter((entry) => {
        const entryTags = entry.tags.map((tag) => tag.toLowerCase());
        return normalized.every((tag) => entryTags.includes(tag));
      });
    }, [targets, activeTags]);

    const addTarget = useCallback(
      (value: string, context: string, tags: string[] = []) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        const ctx = context.trim() || 'general';
        const cleanedTags = normalizeTags(tags);
        setTargets((prev) => [
          ...prev,
          {
            id: generateId(),
            value: trimmed,
            context: ctx,
            tags: cleanedTags,
            createdAt: Date.now(),
          },
        ]);
      },
      [setTargets],
    );

    const updateTags = useCallback(
      (id: string, tags: string[]) => {
        setTargets((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, tags: normalizeTags(tags) }
              : entry,
          ),
        );
      },
      [setTargets],
    );

    const removeTarget = useCallback(
      (id: string) => {
        setTargets((prev) => prev.filter((entry) => entry.id !== id));
      },
      [setTargets],
    );

    const toggleTagFilter = useCallback(
      (tag: string) => {
        const normalized = tag.trim().toLowerCase();
        if (!normalized) return;
        setActiveTags((prev) =>
          prev.includes(normalized)
            ? prev.filter((item) => item !== normalized)
            : [...prev, normalized],
        );
      },
      [setActiveTags],
    );

    const clearFilters = useCallback(() => {
      setActiveTags([]);
    }, [setActiveTags]);

    const value = useMemo(
      () => ({
        targets,
        filteredTargets,
        contexts,
        activeTags,
        addTarget,
        updateTags,
        removeTarget,
        toggleTagFilter,
        clearFilters,
      }),
      [
        targets,
        filteredTargets,
        contexts,
        activeTags,
        addTarget,
        updateTags,
        removeTarget,
        toggleTagFilter,
        clearFilters,
      ],
    );

    return (
      <TargetNotebookContext.Provider value={value}>
        {children}
      </TargetNotebookContext.Provider>
    );
  };

export const useTargetNotebook = () => {
  const context = useContext(TargetNotebookContext);
  if (!context) {
    throw new Error('useTargetNotebook must be used within TargetNotebookProvider');
  }
  return context;
};

interface TargetNotebookProps {
  defaultContext?: string;
  className?: string;
}

const mergeClassNames = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const TargetNotebook: React.FC<TargetNotebookProps> = ({
  defaultContext = 'general',
  className,
}) => {
  const {
    targets,
    filteredTargets,
    contexts,
    activeTags,
    addTarget,
    updateTags,
    removeTarget,
    toggleTagFilter,
    clearFilters,
  } = useTargetNotebook();
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [draftTags, setDraftTags] = useState<Record<string, string>>({});
  const [quickValue, setQuickValue] = useState('');
  const [quickContext, setQuickContext] = useState(defaultContext);
  const [quickTags, setQuickTags] = useState('');

  const formId = useId();
  const datalistId = `${formId}-contexts`;

  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    targets.forEach((entry) => {
      entry.tags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        if (!map.has(normalized)) {
          map.set(normalized, tag);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [targets]);

  const displayedTargets = useMemo(() => {
    const base = [...filteredTargets].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    if (contextFilter === 'all') {
      return base;
    }
    return base.filter((entry) => entry.context === contextFilter);
  }, [filteredTargets, contextFilter]);

  const submitQuickAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tags = quickTags
      ? quickTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    addTarget(quickValue, quickContext || defaultContext, tags);
    setQuickValue('');
    setQuickTags('');
  };

  const contextOptions = useMemo(() => {
    const set = new Set([defaultContext]);
    contexts.forEach((ctx) => set.add(ctx));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contexts, defaultContext]);

  const handleTagSubmit = (id: string) => {
    const draft = draftTags[id]?.trim();
    if (!draft) return;
    const target = targets.find((entry) => entry.id === id);
    if (!target) return;
    updateTags(id, [...target.tags, draft]);
    setDraftTags((prev) => ({ ...prev, [id]: '' }));
  };

  const contextFilterOptions = useMemo(
    () => ['all', ...contextOptions],
    [contextOptions],
  );

  const activeTagSet = useMemo(
    () => new Set(activeTags),
    [activeTags],
  );

  return (
    <div
      className={mergeClassNames(
        'flex flex-col gap-4 rounded bg-gray-900 p-4 text-white',
        className,
      )}
    >
      <form
        onSubmit={submitQuickAdd}
        className="flex flex-col gap-2 rounded border border-gray-700 p-3"
        aria-label="Quick add target"
      >
        <div className="text-sm font-semibold">Quick add</div>
        <label htmlFor={`${formId}-target`} className="sr-only">
          Quick add target
        </label>
        <input
          id={`${formId}-target`}
          value={quickValue}
          onChange={(event) => setQuickValue(event.target.value)}
          placeholder="Target value (e.g. example.com)"
          className="rounded bg-gray-800 p-2 text-sm text-white"
        />
        <label htmlFor={`${formId}-context`} className="sr-only">
          Quick add context
        </label>
        <input
          id={`${formId}-context`}
          list={datalistId}
          value={quickContext}
          onChange={(event) => setQuickContext(event.target.value)}
          placeholder="Context (e.g. recon, intel)"
          className="rounded bg-gray-800 p-2 text-sm text-white"
        />
        <datalist id={datalistId}>
          {contextOptions.map((ctx) => (
            <option value={ctx} key={ctx} />
          ))}
        </datalist>
        <label htmlFor={`${formId}-tags`} className="sr-only">
          Quick add tags
        </label>
        <input
          id={`${formId}-tags`}
          value={quickTags}
          onChange={(event) => setQuickTags(event.target.value)}
          placeholder="Tags (comma separated)"
          className="rounded bg-gray-800 p-2 text-sm text-white"
        />
        <button
          type="submit"
          className="self-start rounded bg-blue-600 px-3 py-1 text-sm"
        >
          Add target
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${formId}-context-filter`} className="text-xs uppercase">
          Context
        </label>
        <select
          id={`${formId}-context-filter`}
          value={contextFilter}
          onChange={(event) => setContextFilter(event.target.value)}
          className="rounded bg-gray-800 p-1 text-sm"
        >
          {contextFilterOptions.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All contexts' : option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Tag filters</div>
        <div className="flex flex-wrap gap-2">
          {allTags.length === 0 && (
            <span className="text-xs text-gray-400">No tags yet</span>
          )}
          {allTags.map((tag) => {
            const normalized = tag.toLowerCase();
            const active = activeTagSet.has(normalized);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                aria-pressed={active}
                className={mergeClassNames(
                  'rounded px-2 py-1 text-xs transition-colors',
                  active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200',
                )}
              >
                {tag}
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded bg-gray-700 px-2 py-1 text-xs text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {displayedTargets.length === 0 ? (
          <div className="text-sm text-gray-400">No targets recorded.</div>
        ) : (
          displayedTargets.map((entry) => (
            <div
              key={entry.id}
              className="rounded border border-gray-700 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{entry.value}</div>
                  <div className="text-xs text-gray-400">Context: {entry.context}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeTarget(entry.id)}
                  className="rounded bg-red-700 px-2 py-1 text-xs"
                  aria-label={`Remove ${entry.value}`}
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {entry.tags.map((tag) => {
                  const normalized = tag.toLowerCase();
                  const active = activeTagSet.has(normalized);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      aria-pressed={active}
                      className={mergeClassNames(
                        'rounded px-2 py-0.5 text-xs transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-200',
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
                <div className="flex items-center gap-1">
                  <label htmlFor={`${entry.id}-tag`} className="sr-only">
                    Add tag to {entry.value}
                  </label>
                  <input
                    id={`${entry.id}-tag`}
                    value={draftTags[entry.id] ?? ''}
                    onChange={(event) =>
                      setDraftTags((prev) => ({
                        ...prev,
                        [entry.id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleTagSubmit(entry.id);
                      }
                    }}
                    placeholder="Add tag"
                    className="w-24 rounded bg-gray-800 px-2 py-1 text-xs text-white"
                    aria-label={`Add tag to ${entry.value}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleTagSubmit(entry.id)}
                    className="rounded bg-gray-700 px-2 py-1 text-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const TargetQuickAdd: React.FC<{
  context: string;
  label?: string;
  placeholder?: string;
}> = ({ context, label = 'Quick add target', placeholder }) => {
  const { addTarget } = useTargetNotebook();
  const [value, setValue] = useState('');
  const [tags, setTags] = useState('');
  const formId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tagList = tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    addTarget(value, context, tagList);
    setValue('');
    setTags('');
  };

  return (
    <form
      onSubmit={submit}
      aria-label={label}
      className="flex gap-2 rounded border border-gray-700 p-2"
    >
      <label htmlFor={`${formId}-value`} className="sr-only">
        {label}
      </label>
      <input
        id={`${formId}-value`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? 'Target value'}
        className="flex-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
      />
      <label htmlFor={`${formId}-tags`} className="sr-only">
        Tags for {label}
      </label>
      <input
        id={`${formId}-tags`}
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="Tags"
        className="w-32 rounded bg-gray-800 px-2 py-1 text-sm text-white"
      />
      <button
        type="submit"
        className="rounded bg-blue-600 px-3 py-1 text-sm"
      >
        Add
      </button>
    </form>
  );
};

export default TargetNotebook;
