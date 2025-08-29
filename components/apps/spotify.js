import React, { useCallback, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState.js';
import useOPFS from '../../hooks/useOPFS.js';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export default function SpotifyApp() {
  const [playlists, setPlaylists, ready] = useOPFS('spotify-playlists.json', {});
  const [mood, setMood] = usePersistentState('spotify-mood', '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [newMood, setNewMood] = useState('');
  const [newId, setNewId] = useState('');
  const gridRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!ready) return;
    if (Object.keys(playlists).length === 0) {
      fetch('/spotify-playlists.json')
        .then((res) => res.json())
        .then((data) => {
          setPlaylists(data);
          const first = Object.keys(data)[0];
          if (first) setMood(first);
        })
        .catch(() => {});
    } else if (!playlists[mood]) {
      const first = Object.keys(playlists)[0];
      if (first) setMood(first);
    }
  }, [ready, playlists, mood, setMood, setPlaylists]);

  useRovingTabIndex(gridRef, true, 'horizontal');

  const post = useCallback((cmd) => {
    iframeRef.current?.contentWindow?.postMessage({ command: cmd }, '*');
  }, []);

  const togglePlay = useCallback(() => {
    post(isPlaying ? 'pause' : 'play');
    setIsPlaying(!isPlaying);
  }, [post, isPlaying]);

  const next = useCallback(() => post('next'), [post]);
  const previous = useCallback(() => post('previous'), [post]);

  const addMood = () => {
    if (!newMood || !newId) return;
    if (playlists[newMood]) return;
    setPlaylists({ ...playlists, [newMood]: newId });
    setNewMood('');
    setNewId('');
  };

  const removeMood = (m) => {
    const { [m]: _, ...rest } = playlists;
    setPlaylists(rest);
    if (mood === m) {
      const first = Object.keys(rest)[0] || '';
      setMood(first);
      setIsPlaying(false);
    }
  };

  const moveMood = (m, dir) => {
    const entries = Object.entries(playlists);
    const index = entries.findIndex(([key]) => key === m);
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= entries.length) return;
    const [item] = entries.splice(index, 1);
    entries.splice(newIndex, 0, item);
    setPlaylists(Object.fromEntries(entries));
  };

  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.origin.includes('spotify')) return;
      const data = e.data;
      if (Array.isArray(data) && data[0] === 'playback_update') {
        setIsPlaying(!data[1]?.is_paused);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleKeys = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'n') {
        next();
      } else if (e.key.toLowerCase() === 'p') {
        previous();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [togglePlay, next, previous]);

  return (
    <div className="h-full w-full bg-ub-cool-grey flex flex-col">
      <div className="p-2 flex gap-2 bg-black bg-opacity-30">
        <input
          value={newMood}
          onChange={(e) => setNewMood(e.target.value)}
          placeholder="Mood"
          className="px-1 rounded text-black flex-1"
        />
        <input
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          placeholder="Playlist ID"
          className="px-1 rounded text-black flex-1"
        />
        <button
          onClick={addMood}
          className="px-2 py-1 bg-black bg-opacity-50 rounded text-white"
        >
          Add
        </button>
      </div>
      <div
        ref={gridRef}
        role="listbox"
        className="grid grid-cols-2 gap-2 p-2 overflow-auto"
      >
        {Object.entries(playlists).map(([m, id]) => (
          <div key={m} className="relative">
            <button
              role="option"
              aria-label={m}
              aria-selected={mood === m}
              onClick={() => {
                setMood(m);
                setIsPlaying(false);
              }}
              className={`focus:outline-none rounded overflow-hidden ${
                mood === m ? 'ring-2 ring-white' : ''
              }`}
            >
              <iframe
                ref={m === mood ? iframeRef : null}
                src={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
                title={m}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
              <span className="block text-center text-xs capitalize">{m}</span>
            </button>
            <div className="absolute top-1 right-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  moveMood(m, -1);
                }}
                className="bg-black bg-opacity-50 text-white text-xs rounded w-4 h-4 flex items-center justify-center"
                aria-label={`Move ${m} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  moveMood(m, 1);
                }}
                className="bg-black bg-opacity-50 text-white text-xs rounded w-4 h-4 flex items-center justify-center"
                aria-label={`Move ${m} down`}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMood(m);
                }}
                className="bg-black bg-opacity-50 text-white text-xs rounded w-4 h-4 flex items-center justify-center"
                aria-label={`Delete ${m}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      {mood && (
        <div className="flex justify-center space-x-4 p-2 bg-black bg-opacity-30 text-white">
          <button onClick={previous} title="Prev (P)" className="flex items-center gap-1">
            ⏮<span className="text-xs">(P)</span>
          </button>
          <button onClick={togglePlay} title="Play/Pause (Space)" className="flex items-center gap-1">
            {isPlaying ? '⏸' : '▶'}<span className="text-xs">(Space)</span>
          </button>
          <button onClick={next} title="Next (N)" className="flex items-center gap-1">
            ⏭<span className="text-xs">(N)</span>
          </button>
        </div>
      )}
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

