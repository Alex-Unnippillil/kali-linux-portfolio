import React, { useEffect, useState } from 'react';

// Detect Premium auth; load Web Playback SDK when available.
// Fallback to public embeds when Premium is unavailable.

const PLAYLIST_EMBED =
  'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator';
const TRACK_EMBED =
  'https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P?utm_source=generator';

export default function SpotifyApp() {
  const [isPremium, setIsPremium] = useState(null); // null = loading
  const [player, setPlayer] = useState(null);
  const [paused, setPaused] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const token =
      (typeof window !== 'undefined' && localStorage.getItem('spotifyToken')) ||
      process.env.NEXT_PUBLIC_SPOTIFY_TOKEN;

    if (!token) {
      setIsPremium(false);
      return;
    }

    fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.product === 'premium') {
          setIsPremium(true);
          loadSDK(token);
        } else {
          setIsPremium(false);
        }
      })
      .catch(() => setIsPremium(false));
  }, []);

  const loadSDK = (token) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const newPlayer = new window.Spotify.Player({
        name: 'Portfolio Web Player',
        getOAuthToken: (cb) => cb(token),
      });

      newPlayer.addListener('ready', () => {
        setSdkReady(true);
      });

      newPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setPaused(state.paused);
      });

      newPlayer.connect();
      setPlayer(newPlayer);
    };
  };

  useEffect(() => {
    return () => {
      player?.disconnect();
    };
  }, [player]);

  const togglePlay = () => player?.togglePlay();
  const nextTrack = () => player?.nextTrack();
  const previousTrack = () => player?.previousTrack();

  if (isPremium === null) {
    return <div className="p-4">Loading...</div>;
  }

  if (!isPremium) {
    return (
      <div className="flex h-full w-full flex-col gap-4 bg-black p-2">
        <iframe
          title="spotify-playlist"
          src={PLAYLIST_EMBED}
          width="100%"
          height="232"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
        <iframe
          title="spotify-track"
          src={TRACK_EMBED}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-black p-4 text-white">
      {sdkReady && (
        <p className="text-sm" data-testid="connect-hint">
          Player loaded. If you don't hear anything, open Spotify and select
          "Portfolio Web Player" from the device list.
        </p>
      )}
      <div className="flex gap-4">
        <button
          onClick={previousTrack}
          aria-label="Previous"
          className="rounded bg-gray-800 px-3 py-2"
        >
          ⏮
        </button>
        <button
          onClick={togglePlay}
          aria-label={paused ? 'Play' : 'Pause'}
          className="rounded bg-gray-800 px-3 py-2"
        >
          {paused ? '▶️' : '⏸️'}
        </button>
        <button
          onClick={nextTrack}
          aria-label="Next"
          className="rounded bg-gray-800 px-3 py-2"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;
