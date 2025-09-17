import { FormEvent, useState } from 'react';
import { Playlist } from '../types';

interface PlaylistSidebarProps {
  playlists: Playlist[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => { ok: boolean; message?: string };
  onDelete: (id: string) => void;
}

const PlaylistSidebar = ({
  playlists,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: PlaylistSidebarProps) => {
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = onCreate(name);
    if (result.ok) {
      setName('');
      setFeedback(null);
    } else if (result.message) {
      setFeedback(result.message);
    }
  };

  return (
    <aside className="md:w-64 w-full border-b md:border-b-0 md:border-r border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_10%)] p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Playlists</h2>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
              placeholder="New playlist name"
              aria-label="New playlist name"
            />
            <button
              type="submit"
              className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm font-medium text-black disabled:opacity-50"
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
          {feedback ? (
            <p className="text-xs text-red-300" role="status">
              {feedback}
            </p>
          ) : null}
        </form>
      </div>
      <ul className="space-y-2 overflow-auto pr-1 max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-12rem)]">
        {playlists.length === 0 ? (
          <li className="text-sm text-[color-mix(in_oklab,var(--color-text),transparent_40%)]">
            No playlists yet. Create one to get started.
          </li>
        ) : (
          playlists.map((playlist) => {
            const isActive = playlist.id === activeId;
            return (
              <li key={playlist.id}>
                <div
                  className={`flex items-center justify-between rounded border border-[var(--color-border)] px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-[color-mix(in_oklab,var(--color-accent),transparent_80%)] text-[var(--color-text-strong)]'
                      : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(playlist.id)}
                    className="flex-1 text-left"
                  >
                    <span className="block font-medium">{playlist.name}</span>
                    <span className="block text-xs opacity-75">
                      {playlist.items.length} {playlist.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(playlist.id)}
                    className="ml-3 text-xs text-[color-mix(in_oklab,var(--color-text),transparent_30%)] hover:text-red-300"
                    aria-label={`Delete ${playlist.name}`}
                    title="Delete playlist"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
};

export default PlaylistSidebar;
