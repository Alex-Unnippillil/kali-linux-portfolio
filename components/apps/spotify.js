import React from 'react';

export default function SpotifyApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey">
      <iframe
        src="https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator"
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

