import React, { ChangeEvent, useMemo } from 'react';

import FilterChip from './FilterChip';
import {
  availableExtensions,
  availableTags,
  availableTypes,
  resetQueryOptions,
  updateQueryOptions,
  useQueryOptions,
} from './searchIndex';

const formatLabel = (value: string) =>
  value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const FilterBar: React.FC = () => {
  const options = useQueryOptions();

  const hasFilters = useMemo(() => {
    const range = options.dateRange;
    return (
      options.types.length > 0 ||
      options.extensions.length > 0 ||
      options.tags.length > 0 ||
      Boolean(range && (range.start || range.end))
    );
  }, [options.dateRange, options.extensions.length, options.tags.length, options.types.length]);

  const toggleType = (type: string) => {
    updateQueryOptions((prev) => {
      const exists = prev.types.includes(type);
      const nextTypes = exists
        ? prev.types.filter((item) => item !== type)
        : [...prev.types, type];
      return { ...prev, types: nextTypes };
    });
  };

  const toggleExtension = (extension: string) => {
    updateQueryOptions((prev) => {
      const exists = prev.extensions.includes(extension);
      const nextExtensions = exists
        ? prev.extensions.filter((item) => item !== extension)
        : [...prev.extensions, extension];
      return { ...prev, extensions: nextExtensions };
    });
  };

  const toggleTag = (tag: string) => {
    updateQueryOptions((prev) => {
      const exists = prev.tags.includes(tag);
      const nextTags = exists
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: nextTags };
    });
  };

  const handleDateChange = (key: 'start' | 'end') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateQueryOptions((prev) => {
        const range = { ...(prev.dateRange ?? {}) };
        if (value) {
          range[key] = value;
        } else if (key === 'start') {
          range.start = undefined;
        } else {
          range.end = undefined;
        }

        if (!range.start && !range.end) {
          return { ...prev, dateRange: null };
        }
        return { ...prev, dateRange: range };
      });
    };

  return (
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[0.65rem] uppercase tracking-wide text-ubt-grey">Filters</h3>
        <button
          type="button"
          onClick={resetQueryOptions}
          disabled={!hasFilters}
          className="rounded border border-white/20 px-2 py-1 text-[0.65rem] uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40 hover:border-ub-orange hover:text-ub-orange"
        >
          Clear
        </button>
      </div>

      <section>
        <h4 className="mb-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey">Type</h4>
        <div
          role="listbox"
          aria-label="Filter by type"
          aria-multiselectable="true"
          className="flex flex-wrap gap-1"
        >
          {availableTypes.map((type) => (
            <FilterChip
              key={type}
              label={formatLabel(type)}
              value={type}
              selected={options.types.includes(type)}
              onToggle={toggleType}
            />
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey">Extension</h4>
        <div
          role="listbox"
          aria-label="Filter by file extension"
          aria-multiselectable="true"
          className="flex flex-wrap gap-1"
        >
          {availableExtensions.map((extension) => (
            <FilterChip
              key={extension}
              label={extension.toUpperCase()}
              value={extension}
              selected={options.extensions.includes(extension)}
              onToggle={toggleExtension}
            />
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey">Tags</h4>
        <div
          role="listbox"
          aria-label="Filter by tag"
          aria-multiselectable="true"
          className="flex max-h-28 flex-wrap gap-1 overflow-y-auto pr-1"
        >
          {availableTags.map((tag) => (
            <FilterChip
              key={tag}
              label={formatLabel(tag)}
              value={tag}
              selected={options.tags.includes(tag)}
              onToggle={toggleTag}
            />
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey">Date range</h4>
        <div className="flex flex-wrap gap-2 text-[0.65rem] text-ubt-grey">
          <label className="flex flex-col gap-1">
            <span>Start</span>
            <input
              type="date"
              value={options.dateRange?.start ?? ''}
              onChange={handleDateChange('start')}
              className="rounded border border-white/20 bg-white px-2 py-1 text-black focus:outline-none focus:ring-2 focus:ring-ub-orange"
              aria-label="Filter start date"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>End</span>
            <input
              type="date"
              value={options.dateRange?.end ?? ''}
              onChange={handleDateChange('end')}
              className="rounded border border-white/20 bg-white px-2 py-1 text-black focus:outline-none focus:ring-2 focus:ring-ub-orange"
              aria-label="Filter end date"
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default FilterBar;
