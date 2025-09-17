import { useMemo, useState } from 'react';
import { MediaItem } from '../types';

interface MediaLibraryProps {
  library: MediaItem[];
  addedIds: Set<string>;
  onAdd: (mediaId: string) => void;
  canAdd: boolean;
  activePlaylistName?: string | null;
}

const MediaLibrary = ({
  library,
  addedIds,
  onAdd,
  canAdd,
  activePlaylistName,
}: MediaLibraryProps) => {
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | string>('all');

  const formats = useMemo(() => {
    const unique = new Set<string>();
    library.forEach((item) => unique.add(item.format));
    return ['all', ...Array.from(unique).sort()];
  }, [library]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return library.filter((item) => {
      if (formatFilter !== 'all' && item.format !== formatFilter) {
        return false;
      }
      if (!search) return true;
      return (
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    });
  }, [formatFilter, library, query]);

  return (
    <section className="flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_8%)] p-4">
      <header className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Media Library</h2>
          <p className="text-xs text-[color-mix(in_oklab,var(--color-text),transparent_45%)]">
            {canAdd
              ? activePlaylistName
                ? `Adding to: ${activePlaylistName}`
                : 'Select a playlist to start building it.'
              : 'Create or select a playlist before adding items.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="flex flex-1 items-center gap-2 min-w-[12rem]">
            <span className="text-xs uppercase tracking-wide opacity-70">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
              placeholder="Filter by title, tag, or description"
              aria-label="Search media library"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide opacity-70">Format</span>
            <select
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
              aria-label="Filter by media format"
            >
              {formats.map((format) => (
                <option key={format} value={format}>
                  {format === 'all' ? 'All formats' : format.charAt(0).toUpperCase() + format.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <div className="mt-4 flex-1 overflow-auto rounded border border-dashed border-[color-mix(in_oklab,var(--color-border),transparent_50%)]">
        <ul className="divide-y divide-[color-mix(in_oklab,var(--color-border),transparent_40%)]">
          {filtered.map((item) => {
            const disabled = addedIds.has(item.id) || !canAdd;
            return (
              <li key={item.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--color-text),transparent_35%)]">
                    {item.duration} • {item.format.toUpperCase()} • {item.tags.join(', ')}
                  </p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--color-text),transparent_50%)]">
                    {item.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(item.id)}
                  disabled={disabled}
                  className="self-start rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium hover:bg-[color-mix(in_oklab,var(--color-surface),transparent_30%)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {addedIds.has(item.id) ? 'Already added' : canAdd ? 'Add to playlist' : 'Select a playlist'}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="p-6 text-center text-sm text-[color-mix(in_oklab,var(--color-text),transparent_45%)]">
              No media matches your filters.
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
};

export default MediaLibrary;
