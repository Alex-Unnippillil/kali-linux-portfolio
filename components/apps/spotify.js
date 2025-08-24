import React from 'react';
import LazyIframe from '../util-components/LazyIframe';

export default function SpotifyApp() {
  return (
    <LazyIframe
      src="https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator"
      title="Daily Mix 2"
      className="h-full w-full bg-panel"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}

export const displaySpotify = () => <SpotifyApp />;

