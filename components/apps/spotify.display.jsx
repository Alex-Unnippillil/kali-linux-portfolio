'use client';

import dynamic from 'next/dynamic';

const SpotifyApp = dynamic(() => import('./spotify'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Connecting to Spotify...
    </div>
  ),
});

export const displaySpotify = () => <SpotifyApp />;

displaySpotify.prefetch = () => {
  if (typeof SpotifyApp.preload === 'function') {
    SpotifyApp.preload();
  }
};
