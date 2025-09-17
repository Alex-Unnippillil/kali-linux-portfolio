"use client";

import { useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import MediaLibrary from './components/MediaLibrary';
import PlaylistEditor from './components/PlaylistEditor';
import PlaylistSidebar from './components/PlaylistSidebar';
import { DEFAULT_PLAYLISTS, MEDIA_LIBRARY } from './data';
import {
  Playlist,
  ResolvedPlaylistItem,
  isPlaylistArray,
} from './types';

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const MediaApp = () => {
  const [playlists, setPlaylists] = usePersistentState<Playlist[]>(
    'media:playlists',
    () => DEFAULT_PLAYLISTS,
    isPlaylistArray,
  );
  const [activePlaylistId, setActivePlaylistId] = usePersistentState<string | null>(
    'media:active-playlist',
    () => DEFAULT_PLAYLISTS[0]?.id ?? null,
    isStringOrNull,
  );

  useEffect(() => {
    if (!playlists.length) {
      if (activePlaylistId !== null) {
        setActivePlaylistId(null);
      }
      return;
    }
    const exists = playlists.some((playlist) => playlist.id === activePlaylistId);
    if (!exists) {
      setActivePlaylistId(playlists[0].id);
    }
  }, [playlists, activePlaylistId, setActivePlaylistId]);

  const mediaMap = useMemo(
    () => new Map(MEDIA_LIBRARY.map((item) => [item.id, item])),
    [],
  );

  const activePlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === activePlaylistId) ?? null,
    [playlists, activePlaylistId],
  );

  const resolvedItems: ResolvedPlaylistItem[] = useMemo(() => {
    if (!activePlaylist) return [];
    return activePlaylist.items.map((entry) => ({
      entry,
      media: mediaMap.get(entry.mediaId),
    }));
  }, [activePlaylist, mediaMap]);

  const addedIds = useMemo(() => {
    if (!activePlaylist) return new Set<string>();
    return new Set(activePlaylist.items.map((item) => item.mediaId));
  }, [activePlaylist]);

  const createPlaylist = (rawName: string) => {
    const name = rawName.trim();
    if (!name) {
      return { ok: false, message: 'Enter a name for the playlist.' };
    }
    if (
      playlists.some((playlist) => playlist.name.toLowerCase() === name.toLowerCase())
    ) {
      return { ok: false, message: 'A playlist with that name already exists.' };
    }
    const id = `playlist-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const timestamp = new Date().toISOString();
    const newPlaylist: Playlist = {
      id,
      name,
      items: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setPlaylists((current) => [...current, newPlaylist]);
    setActivePlaylistId(id);
    return { ok: true as const };
  };

  const deletePlaylist = (id: string) => {
    const index = playlists.findIndex((playlist) => playlist.id === id);
    if (index === -1) {
      return;
    }
    const fallback = playlists[index + 1] ?? playlists[index - 1] ?? null;
    setPlaylists((current) => current.filter((playlist) => playlist.id !== id));
    setActivePlaylistId((current) =>
      current === id ? fallback?.id ?? null : current,
    );
  };

  const renamePlaylist = (name: string) => {
    if (!activePlaylist) return;
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === activePlaylist.id
          ? {
              ...playlist,
              name,
              updatedAt: new Date().toISOString(),
            }
          : playlist,
      ),
    );
  };

  const removeItem = (index: number) => {
    if (!activePlaylist) return;
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== activePlaylist.id) {
          return playlist;
        }
        if (index < 0 || index >= playlist.items.length) {
          return playlist;
        }
        const nextItems = playlist.items.filter((_, itemIndex) => itemIndex !== index);
        return {
          ...playlist,
          items: nextItems,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const moveItem = (from: number, to: number) => {
    if (!activePlaylist) return;
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== activePlaylist.id) {
          return playlist;
        }
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= playlist.items.length ||
          to >= playlist.items.length
        ) {
          return playlist;
        }
        const items = [...playlist.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return {
          ...playlist,
          items,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const clearPlaylist = () => {
    if (!activePlaylist) return;
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === activePlaylist.id
          ? {
              ...playlist,
              items: [],
              updatedAt: new Date().toISOString(),
            }
          : playlist,
      ),
    );
  };

  const addToPlaylist = (mediaId: string) => {
    if (!activePlaylist) return;
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== activePlaylist.id) {
          return playlist;
        }
        if (playlist.items.some((item) => item.mediaId === mediaId)) {
          return playlist;
        }
        return {
          ...playlist,
          items: [...playlist.items, { mediaId }],
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)] md:flex-row">
      <PlaylistSidebar
        playlists={playlists}
        activeId={activePlaylistId}
        onSelect={setActivePlaylistId}
        onCreate={createPlaylist}
        onDelete={(id) => {
          if (window.confirm('Delete this playlist?')) {
            deletePlaylist(id);
          }
        }}
      />
      <div className="flex-1 overflow-hidden">
        <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 p-4 lg:grid-cols-2 lg:grid-rows-1">
          {activePlaylist ? (
            <PlaylistEditor
              name={activePlaylist.name}
              updatedAt={activePlaylist.updatedAt}
              items={resolvedItems}
              onRename={renamePlaylist}
              onRemove={removeItem}
              onMove={moveItem}
              onClear={clearPlaylist}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface),transparent_8%)] p-6 text-center text-sm text-[color-mix(in_oklab,var(--color-text),transparent_45%)]">
              <p className="font-medium">Create your first playlist</p>
              <p className="mt-2 max-w-sm">
                Use the panel on the left to create a playlist. Once selected, you can
                reorder entries and build mixes from the media library.
              </p>
            </div>
          )}
          <MediaLibrary
            library={MEDIA_LIBRARY}
            addedIds={addedIds}
            onAdd={addToPlaylist}
            canAdd={Boolean(activePlaylist)}
            activePlaylistName={activePlaylist?.name ?? null}
          />
        </div>
      </div>
    </div>
  );
};

export default MediaApp;
