import React, { useState } from 'react';
import tracks from './spotify-playlist.json';

export default function SpotifyApp() {
  const [mini, setMini] = useState(false);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white flex flex-col">
      <div className="p-2 flex justify-end">
        <button
          className="px-2 py-1 bg-ub-grey text-xs rounded"
          onClick={() => setMini((m) => !m)}
        >
          {mini ? 'Full Player' : 'Mini Player'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {tracks.map((id) => (
          <iframe
            key={id}
            src={`https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`}
            width="100%"
            height={mini ? '80' : '152'}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
