import React, { useState } from 'react';

const TYPES = [
  { value: 'playlist', label: 'Playlist' },
  { value: 'track', label: 'Track' },
  { value: 'album', label: 'Album' },
  { value: 'user', label: 'Profile' },
];

export default function SpotifyApp() {
  const [type, setType] = useState('playlist');
  const [url, setUrl] = useState('');
  const [embedSrc, setEmbedSrc] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEmbedSrc('');

    const pathType = type;
    let id = url.trim();

    const urlRegex = new RegExp(`open.spotify.com/(?:user|playlist|track|album)/([^/?]+)`, 'i');
    const match = url.match(urlRegex);
    if (match) {
      id = match[1];
    }

    const targetUrl = `https://open.spotify.com/${pathType}/${id}`;

    try {
      const res = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`
      );
      if (!res.ok) throw new Error('Not public');
      setEmbedSrc(`https://open.spotify.com/embed/${pathType}/${id}`);
    } catch (err) {
      setError('Could not load Spotify URL. Make sure it is public.');
    }
  }

  return (
    <div className="h-full w-full bg-ub-cool-grey flex flex-col text-white">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <label htmlFor="spotify-type" className="sr-only">
          Type
        </label>
        <select
          id="spotify-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-black px-2 py-1 rounded"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Spotify URL"
          className="text-black px-2 py-1 rounded"
        />
        <button type="submit" className="bg-ub-blue px-2 py-1 rounded text-white">
          Load
        </button>
      </form>
      {error && (
        <div role="alert" className="p-4">
          {error}
        </div>
      )}
      {embedSrc && (
        <iframe
          src={embedSrc}
          title="Spotify"
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="flex-1"
        />
      )}
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

