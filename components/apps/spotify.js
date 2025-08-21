import React from 'react';

export default function SpotifyApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey">
      <iframe
        src="https://open.spotify.com/embed/playlist/37i9dQZF1DX4dyzvuaRJ0n?utm_source=generator"
        title="Spotify Playlist"
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

