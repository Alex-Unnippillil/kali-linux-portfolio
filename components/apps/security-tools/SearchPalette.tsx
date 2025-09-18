import React, { useMemo } from 'react';

import FilterBar from './FilterBar';
import { getActiveSources, useQueryOptions } from './searchIndex';

interface SearchPaletteProps {
  query: string;
  onQueryChange: (value: string) => void;
}

const formatLabel = (value: string) =>
  value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const SearchPalette: React.FC<SearchPaletteProps> = ({ query, onQueryChange }) => {
  const queryOptions = useQueryOptions();

  const activeFilters = useMemo(() => {
    const entries: string[] = [];
    if (queryOptions.types.length) {
      entries.push(`Type: ${queryOptions.types.map(formatLabel).join(', ')}`);
    }
    if (queryOptions.extensions.length) {
      entries.push(
        `Ext: ${queryOptions.extensions.map((value) => value.toUpperCase()).join(', ')}`,
      );
    }
    if (queryOptions.tags.length) {
      entries.push(`Tags: ${queryOptions.tags.map(formatLabel).join(', ')}`);
    }
    const range = queryOptions.dateRange;
    if (range?.start && range?.end) {
      entries.push(`Date: ${range.start} – ${range.end}`);
    } else if (range?.start) {
      entries.push(`Date ≥ ${range.start}`);
    } else if (range?.end) {
      entries.push(`Date ≤ ${range.end}`);
    }
    return entries;
  }, [queryOptions]);

  const activeSources = useMemo(
    () => getActiveSources(queryOptions).map((source) => source.label),
    [queryOptions],
  );

  return (
    <section className="mb-3 rounded border border-white/10 bg-black/30 p-3 text-xs">
      <label
        htmlFor="security-tools-search"
        className="block text-[0.65rem] uppercase tracking-wide text-ubt-grey"
      >
        Search dataset
      </label>
      <input
        id="security-tools-search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search across logs, rules, and techniques"
        className="mt-1 w-full rounded border border-white/10 bg-white px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-ub-orange"
      />
      {activeFilters.length > 0 ? (
        <p className="mt-2 text-[0.65rem] text-ubt-grey">
          Active filters: {activeFilters.join(' · ')}
        </p>
      ) : (
        <p className="mt-2 text-[0.65rem] text-ubt-grey">
          Refine results by type, file extension, tags, or date.
        </p>
      )}
      {activeSources.length > 0 && (
        <p className="mt-1 text-[0.65rem] text-ubt-grey">
          Included datasets: {activeSources.join(', ')}
        </p>
      )}
      <FilterBar />
    </section>
  );
};

export default SearchPalette;
