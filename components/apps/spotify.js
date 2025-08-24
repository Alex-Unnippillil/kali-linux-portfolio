import React from 'react';
import ExternalFrame from '../ExternalFrame';

export default function SpotifyApp() {
  return (
    <div className="h-full w-full bg-panel">
      <ExternalFrame
        src="https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator"
        title="Daily Mix 2"
        className="h-full w-full"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

