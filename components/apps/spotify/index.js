import React, { useState, useEffect } from 'react';

function toURI(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return url;
    const type = segments[0];
    const id = segments[1];
    return `spotify:${type}:${id}`;
  } catch (e) {
    return url;
  }
}

function PlaylistBuilder() {
  const [trackInput, setTrackInput] = useState('');
  const [tracks, setTracks] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [exportText, setExportText] = useState('');

  const addTrack = () => {
    if (!trackInput) return;
    setTracks([...tracks, trackInput]);
    setTrackInput('');
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (index) => {
    if (dragIndex === null) return;
    const updated = [...tracks];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, removed);
    setTracks(updated);
    setDragIndex(null);
  };

  const exportUris = () => {
    const uris = tracks.map(toURI).join('\n');
    setExportText(uris);
  };

  const shareText = () => {
    setExportText(tracks.join('\n'));
  };

  return (
    <div className="p-2" data-testid="playlist-builder">
      <div className="flex gap-2 mb-2">
        <input
          data-testid="track-input"
          className="flex-1 p-1 border"
          value={trackInput}
          onChange={(e) => setTrackInput(e.target.value)}
          placeholder="Track URL"
        />
        <button
          data-testid="add-track"
          className="px-2 py-1 bg-ub-warm-grey"
          onClick={addTrack}
        >
          Add
        </button>
      </div>
      <ul className="mb-2">
        {tracks.map((t, i) => (
          <li
            key={i}
            data-testid="track-item"
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            className="p-1 border mb-1 bg-white cursor-move"
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mb-2">
        <button
          data-testid="export-uris"
          className="px-2 py-1 bg-ub-warm-grey"
          onClick={exportUris}
        >
          Export URIs
        </button>
        <button
          data-testid="share-text"
          className="px-2 py-1 bg-ub-warm-grey"
          onClick={shareText}
        >
          Share Text
        </button>
      </div>
      <textarea
        data-testid="export-output"
        className="w-full p-1 border"
        readOnly
        value={exportText}
      />
    </div>
  );
}

export default function SpotifyApp() {
  const [type, setType] = useState('playlist');
  const [url, setUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [error, setError] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (!embedUrl) return;
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'j') {
        setCurrentTime((t) => Math.max(0, t - 10));
      } else if (e.key.toLowerCase() === 'l') {
        setCurrentTime((t) => t + 10);
      } else if (e.key.toLowerCase() === 's') {
        setMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [embedUrl]);

  const loadUrl = () => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== 'open.spotify.com') throw new Error();
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments[0] !== type) throw new Error();
      const id = segments[1];
      const embed = `https://open.spotify.com/embed/${type}/${id}`;
      setEmbedUrl(embed);
      setError('');
    } catch (e) {
      setError('Invalid or private URL');
      setEmbedUrl('');
    }
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey p-2" data-testid="spotify-app">
      <div className="flex gap-2 mb-2">
        <select
          data-testid="type-select"
          className="p-1 border"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="playlist">Playlist</option>
          <option value="track">Track</option>
          <option value="album">Album</option>
          <option value="user">Profile</option>
        </select>
        <input
          data-testid="url-input"
          className="flex-1 p-1 border"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Spotify URL"
        />
        <button
          data-testid="load-btn"
          className="px-2 py-1 bg-ub-warm-grey"
          onClick={loadUrl}
        >
          Load
        </button>
      </div>
      {error && (
        <div role="alert" className="text-red-500 mb-2">
          {error}
        </div>
      )}
      {embedUrl && (
        <iframe
          data-testid="spotify-embed"
          src={embedUrl}
          title="spotify-embed"
          width="100%"
          height="200"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      <div data-testid="status">Status: {isPlaying ? 'Playing' : 'Paused'}</div>
      <div data-testid="time">Time: {currentTime}</div>
      <div data-testid="muted">Muted: {muted ? 'true' : 'false'}</div>
      <PlaylistBuilder />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;
