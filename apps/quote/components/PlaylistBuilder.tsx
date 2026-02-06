'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Quote } from '../../../quotes/localQuotes';

interface PlaylistBuilderProps {
  quotes: Quote[];
  playlist: number[];
  setPlaylist: (ids: number[]) => void;
}

export default function PlaylistBuilder({ quotes, playlist, setPlaylist }: PlaylistBuilderProps) {
  const [search, setSearch] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [saved, setSaved] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('quote-playlists');
    if (stored) {
      try {
        setSaved(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('quote-playlists', JSON.stringify(saved));
  }, [saved]);

  const items = useMemo(
    () =>
      quotes
        .map((q, i) => ({ q, i }))
        .filter(({ q }) =>
          q.content.toLowerCase().includes(search.toLowerCase()) ||
          q.author.toLowerCase().includes(search.toLowerCase()),
        ),
    [quotes, search],
  );

  const toggle = (i: number) => {
    setPlaylist(
      playlist.includes(i)
        ? playlist.filter((p) => p !== i)
        : [...playlist, i],
    );
  };

  const saveCurrent = () => {
    const name = playlistName.trim();
    if (!name || !playlist.length) return;
    setSaved((s) => ({ ...s, [name]: [...playlist] }));
    setPlaylistName('');
  };

  const loadPlaylist = (name: string) => {
    const list = saved[name];
    if (list) setPlaylist(list);
  };

  const deletePlaylist = (name: string) => {
    setSaved((s) => {
      const next = { ...s };
      delete next[name];
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (playlist.length) url.searchParams.set('playlist', playlist.join(','));
    else url.searchParams.delete('playlist');
    window.history.replaceState(null, '', url.toString());
  }, [playlist]);

  return (
    <div className="w-full mt-4">
      <h2 className="text-lg mb-2">Playlist Builder</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search quotes"
        className="px-2 py-1 mb-2 w-full rounded text-black"
      />
      <ul className="max-h-40 overflow-auto border border-gray-700 rounded mb-2">
        {items.map(({ q, i }) => (
          <li
            key={i}
            className="px-2 py-1 flex justify-between items-center text-sm border-b border-gray-700 last:border-b-0"
          >
            <span className="flex-1 mr-2">
              {q.content.slice(0, 50)} - {q.author}
            </span>
            <button
              onClick={() => toggle(i)}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              {playlist.includes(i) ? 'Remove' : 'Add'}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mb-2">
        <input
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          placeholder="Playlist name"
          className="px-2 py-1 w-full rounded text-black"
        />
        <button
          onClick={saveCurrent}
          className="px-2 py-1 bg-gray-700 rounded"
          disabled={!playlist.length}
        >
          Save
        </button>
      </div>
      {Object.keys(saved).length > 0 && (
        <div className="mb-2">
          <h3 className="text-md mb-1">Saved Playlists</h3>
          <ul className="max-h-32 overflow-auto border border-gray-700 rounded">
            {Object.entries(saved).map(([name, list]) => (
              <li
                key={name}
                className="px-2 py-1 text-sm border-b border-gray-700 last:border-b-0 flex justify-between items-center"
              >
                <span className="flex-1 mr-2 truncate">
                  {name} ({list.length})
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => loadPlaylist(name)}
                    className="px-2 py-1 bg-gray-700 rounded"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deletePlaylist(name)}
                    className="px-2 py-1 bg-gray-700 rounded"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3 className="text-md mb-1">Current Playlist</h3>
      <ol className="max-h-32 overflow-auto border border-gray-700 rounded">
        {playlist.map((i, idx) => (
          <li
            key={i}
            className="px-2 py-1 text-sm border-b border-gray-700 last:border-b-0 flex justify-between items-center"
          >
            <span className="flex-1 mr-2">
              {quotes[i]?.content.slice(0, 50)} - {quotes[i]?.author}
            </span>
            <button
              onClick={() =>
                setPlaylist(playlist.filter((_, j) => j !== idx))
              }
              className="px-2 py-1 bg-gray-700 rounded"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

