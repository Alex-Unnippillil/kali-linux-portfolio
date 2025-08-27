import React, { useState, useCallback } from 'react';
import { setWakeLock } from '../../utils/wakeLock';

export default function SpotifyApp() {
  const [awake, setAwake] = useState(false);
  const [error, setError] = useState('');

  const toggle = useCallback(async () => {
    const next = !awake;
    try {
      await setWakeLock(next);
      setAwake(next);
      setError('');
    } catch (err) {
      setError(err?.message || String(err));
      setAwake(false);
    }
  }, [awake]);

  return (
    <div className="h-full w-full bg-ub-cool-grey relative">
      <button
        type="button"
        aria-pressed={awake}
        onClick={toggle}
        aria-label="Toggle wake lock"
        className="absolute top-2 right-2 z-10 bg-gray-700 text-white rounded px-2 py-1"
      >
        {awake ? 'Awake' : 'Sleep'}
      </button>
      {error && (
        <p className="absolute bottom-2 left-2 text-xs text-red-500">{error}</p>
      )}
      <iframe
        src="https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator&theme=0"
        title="Daily Mix 2"
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

