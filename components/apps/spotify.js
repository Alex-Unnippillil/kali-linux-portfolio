import React from 'react';
import ExternalFrame from '../ExternalFrame';
import ErrorBoundary from '../ErrorBoundary';

export default function SpotifyApp() {
  return (
    <ErrorBoundary>
      <ExternalFrame
        appId="spotify"
        className="h-full w-full bg-ub-cool-grey"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </ErrorBoundary>
  );
}

export const displaySpotify = () => <SpotifyApp />;
