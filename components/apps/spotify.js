import React, { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState.js';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export default function SpotifyApp() {
  const [playlists, setPlaylists] = useState({});
  const [mood, setMood] = usePersistentState('spotify-mood', '');
  const [isPlaying, setIsPlaying] = useState(false);
  const gridRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetch('/spotify-playlists.json')
      .then((res) => res.json())
      .then((data) => {
        setPlaylists(data);
        if (!data[mood]) {
          const first = Object.keys(data)[0];
          if (first) setMood(first);
        }
      })
      .catch(() => {});
  }, []);

  useRovingTabIndex(gridRef, true, 'horizontal');

  const post = (cmd) => {
    iframeRef.current?.contentWindow?.postMessage({ command: cmd }, '*');
  };

  const togglePlay = () => {
    post(isPlaying ? 'pause' : 'play');
    setIsPlaying(!isPlaying);
  };

  const next = () => post('next');
  const previous = () => post('previous');

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
  }, [togglePlay]);

  return (
    <div className="h-full w-full bg-ub-cool-grey flex flex-col">
      <div
        ref={gridRef}
        role="listbox"
        className="grid grid-cols-2 gap-2 p-2 overflow-auto"
      >
        {Object.entries(playlists).map(([m, id]) => (
          <button
            key={m}
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

