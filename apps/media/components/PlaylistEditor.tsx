import { FormEvent, useEffect, useState } from 'react';
import { ResolvedPlaylistItem } from '../types';

interface PlaylistEditorProps {
  name: string;
  updatedAt: string;
  items: ResolvedPlaylistItem[];
  onRename: (name: string) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onClear: () => void;
}

const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
};

const PlaylistEditor = ({
  name,
  updatedAt,
  items,
  onRename,
  onRemove,
  onMove,
  onClear,
}: PlaylistEditorProps) => {
  const [draftName, setDraftName] = useState(name);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) {
      setFeedback('Playlist name cannot be empty.');
      return;
    }
    if (trimmed !== name) {
      onRename(trimmed);
    }
    setFeedback(null);
  };

  return (
    <section className="flex h-full flex-col rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_8%)] p-4">
      <header className="space-y-2">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="min-w-[12rem] flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-lg font-semibold"
            aria-label="Playlist name"
          />
          <button
            type="submit"
            className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm font-medium text-black"
          >
            Save name
          </button>
          <button
            type="button"
            onClick={() => {
              if (items.length === 0 || window.confirm('Remove all items from this playlist?')) {
                onClear();
              }
            }}
            className="rounded border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[color-mix(in_oklab,var(--color-surface),transparent_30%)]"
          >
            Clear playlist
          </button>
        </form>
        {feedback ? <p className="text-xs text-red-300">{feedback}</p> : null}
        <p className="text-xs text-[color-mix(in_oklab,var(--color-text),transparent_40%)]">
          Updated {formatTimestamp(updatedAt)}
        </p>
      </header>
      <div className="mt-4 flex-1 overflow-auto rounded border border-dashed border-[color-mix(in_oklab,var(--color-border),transparent_50%)] bg-[color-mix(in_oklab,var(--color-surface),transparent_30%)]">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[color-mix(in_oklab,var(--color-text),transparent_40%)]">
            Use the media library to add items to this playlist.
          </div>
        ) : (
          <ol className="divide-y divide-[color-mix(in_oklab,var(--color-border),transparent_40%)]">
            {items.map(({ entry, media }, index) => (
              <li key={`${entry.mediaId}-${index}`} className="flex items-start justify-between gap-3 px-3 py-3">
                <div className="flex-1">
                  <p className="font-medium">
                    <span className="mr-2 text-xs opacity-60">{index + 1}.</span>
                    {media ? media.title : 'Missing media item'}
                  </p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--color-text),transparent_35%)]">
                    {media
                      ? `${media.duration} • ${media.format.toUpperCase()}${media.tags.length ? ` • ${media.tags.join(', ')}` : ''}`
                      : entry.mediaId}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                    className="rounded border border-[var(--color-border)] px-2 py-1 disabled:opacity-40"
                  >
                    ↑ Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="rounded border border-[var(--color-border)] px-2 py-1 disabled:opacity-40"
                  >
                    ↓ Move down
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded border border-[var(--color-border)] px-2 py-1 text-red-300 hover:bg-[color-mix(in_oklab,var(--color-surface),transparent_30%)]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export default PlaylistEditor;
